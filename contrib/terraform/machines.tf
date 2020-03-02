# Provisioning of machine groups
locals {
  machine_groups = {
    for name, group in var.machine_groups :
    name => {
      count    = group.count,
      flavor   = var.openstack_flavors[group.flavor],
      image    = var.openstack_images[group.image].image,
      user     = var.openstack_images[group.image].user,
      networks = group.networks,
    }
  }
}

# Machine ports
resource "openstack_networking_port_v2" "access_machines" {
  for_each = local.heat.enabled ? {} : {
    for item in flatten([
      for name, group in local.machine_groups :
      [
        for idx in range(group.count) :
        {
          index = idx,
          name  = "${name}-${idx + 1}",
          group = group
        }
      ]
    ]) : item.name => item
  }

  name       = "${local.prefix}-access-${each.key}"
  network_id = data.openstack_networking_network_v2.access_network.id

  admin_state_up = true

  security_group_ids = [
    openstack_networking_secgroup_v2.ingress[0].id,
    var.access_network.online
    ? openstack_networking_secgroup_v2.open_egress[0].id
    : openstack_networking_secgroup_v2.restricted_egress[0].id,
  ]
}

resource "openstack_networking_port_v2" "private_machines" {
  for_each = local.heat.enabled ? {} : {
    for item in flatten([
      for name, group in local.machine_groups :
      [
        for pair in setproduct(range(group.count), group.networks) :
        {
          index  = pair[0],
          name   = "${pair[1]}-${name}-${pair[0] + 1}",
          subnet = local.private_subnets[pair[1]],
        }
      ]
    ]) : item.name => item
  }

  name       = "${local.prefix}-${replace(each.key, "_", "-")}"
  network_id = each.value.subnet.network_id

  admin_state_up        = true
  no_security_groups    = true
  port_security_enabled = false

  fixed_ip {
    subnet_id = each.value.subnet.id
  }
}

# Cloud-init
data "template_cloudinit_config" "machines" {
  for_each = local.heat.enabled ? {} : {
    for item in flatten([
      for g_name, group in local.machine_groups :
      [
        for idx in range(group.count) :
        {
          index = idx,
          name  = "${g_name}-${idx + 1}",
          group = {
            name = g_name,
          }
        }
      ]
    ]) : item.name => item
  }

  gzip          = false
  base64_encode = false

  # Setup network interfaces for private ports
  part {
    filename     = "net-ifaces.cfg"
    content_type = "text/cloud-config"
    content = <<EOT
#cloud-config
write_files:
- path: /run/metalk8s/scripts/network-iface-config.sh
  owner: root:root
  permissions: '0755'
  content: |
    ${join(
    "\n    ",
    split("\n", file("${path.root}/scripts/network-iface-config.sh"))
  )}

runcmd:
%{for idx, network in keys(var.private_networks)~}
- sudo /run/metalk8s/scripts/network-iface-config.sh ${
  openstack_networking_port_v2.private_machines["${network}-${each.key}"].mac_address
}
%{endfor~}
EOT

merge_type = "list(append)+dict(no_replace,recurse_list)"
}

# Provision SSH keypair
part {
  filename     = "ssh.cfg"
  content_type = "text/cloud-config"
  content      = <<EOT
#cloud-config
ssh_authorized_keys:
  - ${openstack_compute_keypair_v2.local.public_key}
%{if local.bastion.enabled~}
  - ${openstack_compute_keypair_v2.bastion[0].public_key}
%{endif~}
EOT

  merge_type = "list(append)+dict(no_replace,recurse_list)"
}

# RHEL Subscription Manager setup
dynamic "part" {
  for_each = (
    # Only provision if Bastion image name contains "rhel" (case-insensitive)
    length(regexall("(?i:rhel)", local.bastion.image)) > 0 ? [""] : []
  )

  content {
    filename     = "rhel-subscription.cfg"
    content_type = "text/cloud-config"
    content      = <<EOF
#cloud-config
rh_subscription:
  username: "${var.rhel_subscription.username}"
  password: "${var.rhel_subscription.password}"
  auto-attach: True
  enable-repo:
  - rhel-7-server-extras-rpms
  - rhel-7-server-optional-rpms
EOF

    merge_type = "list(append)+dict(no_replace,recurse_list)"
  }
}

# Setup forward proxy (provided by Bastion) where needed
dynamic "part" {
  # Only provision if running offline
  for_each = local.bastion.enabled && ! var.access_network.online ? [""] : []

  content {
    filename     = "setup-proxy.cfg"
    content_type = "text/cloud-config"
    content = <<EOF
#cloud-config
write_files:
- path: /run/metalk8s/scripts/setup_proxy.py
  owner: root:root
  content: |
    ${join(
    "\n    ",
    split("\n", file("${path.root}/scripts/setup_proxy.py"))
    )}

runcmd:
- ${join(" ", [
      "python", "/run/metalk8s/scripts/setup_proxy.py",
      "--proxy-host", local.bastion_info.access_ip,
      "--proxy-port", local.bastion.proxy_port,
])}
EOF

merge_type = "list(append)+dict(no_replace,recurse_list)"
}
}
}


resource "openstack_compute_instance_v2" "machines" {
  for_each = local.heat.enabled ? {} : {
    for item in flatten([
      for name, group in local.machine_groups :
      [
        for idx in range(group.count) :
        {
          index = idx,
          name  = "${name}-${idx + 1}",
          group = group
        }
      ]
    ]) : item.name => item
  }

  name        = "${local.prefix}-${each.key}"
  image_name  = each.value.group.image
  flavor_name = each.value.group.flavor
  key_pair    = openstack_compute_keypair_v2.local.name

  user_data = data.template_cloudinit_config.machines[each.key].rendered

  network {
    access_network = true
    port           = openstack_networking_port_v2.access_machines[each.key].id
  }

  dynamic "network" {
    for_each = toset([
      for network in each.value.group.networks :
      openstack_networking_port_v2.private_machines["${network}-${each.key}"].id
    ])
    iterator = port

    content {
      access_network = false
      port           = port.value
    }
  }

  connection {
    host        = self.access_ip_v4
    type        = "ssh"
    user        = each.value.group.user
    private_key = local.access_private_key
  }

  # Authorize Bastion SSH identity
  provisioner "remote-exec" {
    inline = [
      "echo '${openstack_compute_keypair_v2.bastion[0].public_key}' >> ~/.ssh/authorized_keys",
    ]
  }
}

locals {
  machines_info = local.heat.enabled ? {} : {
    for name, group in var.machine_groups :
    name => {
      for idx in range(group.count) :
      "${name}-${idx + 1}" => {
        access_ip = "${
          openstack_compute_instance_v2.machines["${name}-${idx + 1}"]
          .access_ip_v4
        }",
        private_ips = {
          for network in group.networks :
          network => "${
            openstack_networking_port_v2
            .private_machines["${network}-${name}-${idx + 1}"].all_fixed_ips[0]
          }"
        },
      }
    }
  }
}
