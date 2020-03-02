locals {
  bastion = {
    enabled    = var.bastion.enabled,
    flavor     = var.openstack_flavors[var.bastion.flavor],
    image      = var.openstack_images[var.bastion.image].image,
    user       = var.openstack_images[var.bastion.image].user,
    proxy_port = var.bastion_proxy_port,
  }
}

# Ports
resource "openstack_networking_port_v2" "access_bastion" {
  name       = "${local.prefix}-access-bastion"
  network_id = data.openstack_networking_network_v2.access_network.id

  admin_state_up = true

  security_group_ids = [
    openstack_networking_secgroup_v2.ingress[0].id,
    openstack_networking_secgroup_v2.open_egress[0].id,
  ]

  count = local.bastion.enabled && ! local.heat.enabled ? 1 : 0
}

resource "openstack_networking_port_v2" "private_bastion" {
  for_each = (
    local.bastion.enabled && ! local.heat.enabled
  ) ? toset(keys(var.private_networks)) : []

  name       = "${local.prefix}-${each.value}-bastion"
  network_id = local.private_subnets[each.value].network_id

  admin_state_up        = true
  no_security_groups    = true
  port_security_enabled = false

  fixed_ip {
    subnet_id = local.private_subnets[each.value].id
  }
}

# Cloud-init
data "template_cloudinit_config" "bastion" {
  count = local.bastion.enabled && ! local.heat.enabled ? 1 : 0

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
  openstack_networking_port_v2.private_bastion[network].mac_address
}
%{endfor~}
EOT

merge_type = "list(append)+dict(no_replace,recurse_list)"
}

# Provision SSH keypair
part {
  filename     = "ssh.cfg"
  content_type = "text/cloud-config"
  content = <<EOT
#cloud-config
ssh_authorized_keys:
  - ${openstack_compute_keypair_v2.local.public_key}

ssh_keys:
  rsa_private: |
    ${join(
  "\n    ",
  split("\n", openstack_compute_keypair_v2.bastion[0].private_key)
)}
  rsa_public: ${openstack_compute_keypair_v2.bastion[0].public_key}
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

# Setup Squid HTTP forward proxy
dynamic "part" {
  # Only provision if running offline
  for_each = var.access_network.online ? [] : [""]

  content {
    filename     = "squid.cfg"
    content_type = "text/cloud-config"
    content = <<EOF
#cloud-config
packages:
- squid

write_files:
- path: /etc/squid/squid.conf
  owner: root:root
  content: |
    ${join(
    "\n    ",
    split("\n", templatefile(
      "${path.root}/templates/squid.conf.tpl",
      {
        src_cidr   = data.openstack_networking_subnet_v2.access_subnet.cidr,
        proxy_port = local.bastion.proxy_port,
      }
    ))
)}

runcmd:
- systemctl enable squid
- systemctl start squid
EOF

merge_type = "list(append)+dict(no_replace,recurse_list)"
}
}
}

# VM
resource "openstack_compute_instance_v2" "bastion" {
  count = local.bastion.enabled && ! local.heat.enabled ? 1 : 0

  name        = "${local.prefix}-bastion"
  image_name  = local.bastion.image
  flavor_name = local.bastion.flavor
  key_pair    = openstack_compute_keypair_v2.local.name

  user_data = data.template_cloudinit_config.bastion[0].rendered

  network {
    access_network = true
    port           = openstack_networking_port_v2.access_bastion[0].id
  }

  dynamic "network" {
    for_each = openstack_networking_port_v2.private_bastion
    iterator = port

    content {
      access_network = false
      port           = port.value.id
    }
  }

  connection {
    host        = self.access_ip_v4
    type        = "ssh"
    user        = local.bastion.user
    private_key = local.access_private_key
  }

  provisioner "remote-exec" {
    when       = destroy
    on_failure = continue
    inline = length(regexall("(?i:rhel)", local.bastion.image)) > 0 ? [
      "sudo subscription-manager unregister"
    ] : ["echo 'Nothing to do, not on a RHEL-based system."]
  }
}

locals {
  bastion_info = (
    local.bastion.enabled && ! local.heat.enabled
    ? {
      access_ip = join("", openstack_compute_instance_v2.bastion[*].access_ip_v4)
      private_ips = {
        for key, port in openstack_networking_port_v2.private_bastion :
        key => port.all_fixed_ips[0]
      }
    }
    : { access_ip = "", private_ips = {} }
  )
}

# locals {
#   bastion_ip = (
#     local.heat.enabled
#     ? openstack_orchestration_stack.outputs.cluster.bastion.public_ip
#     : (
#       local.bastion.enabled
#       ? openstack_compute_instance_v2.bastion[0].access_ip_v4
#       : ""
#     )
#   )
# }


# # Scripts provisioning (cloud-init!)
# resource "null_resource" "provision_scripts_bastion" {
#   count = local.bastion.enabled && !local.heat.enabled ? 1 : 0

#   depends_on = [
#     openstack_compute_instance_v2.bastion,
#   ]

#   triggers = {
#     bastion = openstack_compute_instance_v2.bastion[0].id,
#     script_hashes = join(",", compact([
#       # List of hashes for scripts that will be used
#       local.using_rhel.bastion ? local.script_hashes.rhsm_register : "",
#       local.script_hashes.iface_config,
#     ])),
#   }

#   connection {
#     host        = bastion_ip
#     type        = "ssh"
#     user        = local.bastion.user
#     private_key = local.access_private_key
#   }

#   # Provision scripts for remote-execution
#   provisioner "remote-exec" {
#     inline = ["mkdir -p /tmp/metalk8s"]
#   }

#   provisioner "file" {
#     source      = "${path.root}/scripts"
#     destination = "/tmp/metalk8s/"
#   }

#   provisioner "remote-exec" {
#     inline = ["chmod -R +x /tmp/metalk8s/scripts"]
#   }
# }

# # (cloud-init!)
# resource "null_resource" "configure_rhsm_bastion" {
#   # Configure RedHat Subscription Manager if enabled
#   count = (
#     local.bastion.enabled
#     && local.using_rhel.bastion
#     && !local.heat.enabled
#   ) ? 1 : 0

#   depends_on = [
#     openstack_compute_instance_v2.bastion,
#     null_resource.provision_scripts_bastion,
#   ]

#   connection {
#     host        = local.bastion_ip
#     type        = "ssh"
#     user        = local.bastion.user
#     private_key = local.access_private_key
#   }

#   provisioner "remote-exec" {
#     inline = [
#       join(" ", [
#         "sudo bash /tmp/metalk8s/scripts/rhsm-register.sh",
#         "'${var.rhsm_username}' '${var.rhsm_password}'",
#       ]),
#     ]
#   }

#   provisioner "remote-exec" {
#     when       = destroy
#     on_failure = continue
#     inline     = ["sudo subscription-manager unregister"]
#   }
# }


# # resource "openstack_compute_interface_attach_v2" "control_plane_bastion" {
# #   count = length(openstack_networking_port_v2.control_plane_bastion)

# #   instance_id = openstack_compute_instance_v2.bastion[0].id
# #   port_id     = openstack_networking_port_v2.control_plane_bastion[0].id
# # }
# # resource "openstack_compute_interface_attach_v2" "workload_plane_bastion" {
# #   count = length(openstack_networking_port_v2.workload_plane_bastion)

# #   instance_id = openstack_compute_instance_v2.bastion[0].id
# #   port_id     = openstack_networking_port_v2.workload_plane_bastion[0].id
# # }

# # TODO: use cloud-init
# resource "null_resource" "bastion_iface_config" {
#   count = local.bastion.enabled && !local.heat.enabled ? 1 : 0

#   depends_on = [
#     openstack_compute_instance_v2.bastion,
#     null_resource.provision_scripts_bastion,
#   ]

#   triggers = {
#     bastion = openstack_compute_instance_v2.bastion[0].id,
#     cp_port = (
#       length(openstack_networking_port_v2.control_plane_bastion) != 0
#       ? openstack_networking_port_v2.control_plane_bastion[0].id
#       : ""
#     ),
#     wp_port = (
#       length(openstack_networking_port_v2.workload_plane_bastion) != 0
#       ? openstack_networking_port_v2.workload_plane_bastion[0].id
#       : ""
#     )
#   }

#   connection {
#     host        = openstack_compute_instance_v2.bastion[0].access_ip_v4
#     type        = "ssh"
#     user        = local.bastion.user
#     private_key = local.access_private_key
#   }

#   # Configure network interfaces for private networks
#   provisioner "remote-exec" {
#     inline = [
#       for mac_address in concat(
#         length(openstack_networking_port_v2.control_plane_bastion) != 0
#         ? [openstack_networking_port_v2.control_plane_bastion[0].mac_address]
#         : [],
#         length(openstack_networking_port_v2.workload_plane_bastion) != 0
#         ? [openstack_networking_port_v2.workload_plane_bastion[0].mac_address]
#         : [],
#       ) :
#       "sudo bash /tmp/metalk8s/scripts/network-iface-config.sh ${mac_address}"
#     ]
#   }
# }


# # HTTP proxy for selective online access from Bootstrap or Nodes (disabled if
# # cluster is online)
# resource "null_resource" "bastion_http_proxy" {
#   count = local.bastion.enabled && ! var.online && !local.heat.enabled ? 1 : 0

#   depends_on = [openstack_compute_instance_v2.bastion]

#   connection {
#     host        = openstack_compute_instance_v2.bastion[0].access_ip_v4
#     type        = "ssh"
#     user        = local.bastion.user
#     private_key = local.access_private_key
#   }


# }
