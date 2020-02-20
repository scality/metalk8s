locals {
  bastion = {
    enabled    = var.bastion.enabled,
    flavour    = var.openstack_flavours[var.bastion.flavour],
    image      = var.openstack_images[var.bastion.image].image,
    user       = var.openstack_images[var.bastion.image].user,
    proxy_port = var.bastion_proxy_port,
  }
}

resource "openstack_compute_instance_v2" "bastion" {
  count = local.bastion.enabled ? 1 : 0

  name = "${local.prefix}-bastion"

  # WARNING: if CentOS is not used, setup of Bastion services may not work as
  #          expected
  image_name  = local.bastion.image
  flavor_name = local.bastion.flavour
  key_pair    = openstack_compute_keypair_v2.local.name

  security_groups = concat(
    [openstack_networking_secgroup_v2.nodes.name],
    openstack_networking_secgroup_v2.bastion[*].name,
  )

  # NOTE: this does not work - ifaces are not yet attached when this runs at
  #       first boot
  # user_data = <<-EOT
  # #cloud-config
  # network:
  #   version: 2
  #   ethernets:
  #     all:
  #       match:
  #         name: eth*
  #       dhcp4: true
  # EOT

  network {
    access_network = true
    name           = data.openstack_networking_network_v2.public_network.name
  }

  connection {
    host        = self.access_ip_v4
    type        = "ssh"
    user        = local.bastion.user
    private_key = openstack_compute_keypair_v2.local.private_key
  }

  # Provision SSH identities
  provisioner "file" {
    content     = openstack_compute_keypair_v2.bastion.public_key
    destination = "/home/${local.bastion.user}/.ssh/bastion.pub"
  }

  provisioner "file" {
    content     = openstack_compute_keypair_v2.bastion.private_key
    destination = "/home/${local.bastion.user}/.ssh/bastion"
  }

  provisioner "remote-exec" {
    inline = ["chmod 600 /home/${local.bastion.user}/.ssh/bastion*"]
  }
}

locals {
  bastion_ip = (
    local.bastion.enabled
    ? openstack_compute_instance_v2.bastion[0].access_ip_v4
    : ""
  )
}


# Scripts provisioning
resource "null_resource" "provision_scripts_bastion" {
  count = local.bastion.enabled ? 1 : 0

  depends_on = [
    openstack_compute_instance_v2.bastion,
  ]

  triggers = {
    bastion = openstack_compute_instance_v2.bastion[0].id,
    script_hashes = join(",", compact([
      # List of hashes for scripts that will be used
      local.using_rhel.bastion ? local.script_hashes.rhsm_register : "",
      local.script_hashes.iface_config,
    ])),
  }

  connection {
    host        = openstack_compute_instance_v2.bastion[0].access_ip_v4
    type        = "ssh"
    user        = local.bastion.user
    private_key = openstack_compute_keypair_v2.local.private_key
  }

  # Provision scripts for remote-execution
  provisioner "remote-exec" {
    inline = ["mkdir -p /tmp/metalk8s"]
  }

  provisioner "file" {
    source      = "${path.root}/scripts"
    destination = "/tmp/metalk8s/"
  }

  provisioner "remote-exec" {
    inline = ["chmod -R +x /tmp/metalk8s/scripts"]
  }
}

resource "null_resource" "configure_rhsm_bastion" {
  # Configure RedHat Subscription Manager if enabled
  count = (local.bastion.enabled && local.using_rhel.bastion) ? 1 : 0

  depends_on = [
    openstack_compute_instance_v2.bastion,
    null_resource.provision_scripts_bastion,
  ]

  connection {
    host        = openstack_compute_instance_v2.bastion[0].access_ip_v4
    type        = "ssh"
    user        = local.bastion.user
    private_key = openstack_compute_keypair_v2.local.private_key
  }

  provisioner "remote-exec" {
    inline = [
      join(" ", [
        "sudo bash /tmp/metalk8s/scripts/rhsm-register.sh",
        "'${var.rhsm_username}' '${var.rhsm_password}'",
      ]),
    ]
  }

  provisioner "remote-exec" {
    when       = destroy
    on_failure = continue
    inline     = ["sudo subscription-manager unregister"]
  }
}


# Ports on private networks
resource "openstack_networking_port_v2" "control_plane_bastion" {
  name       = "${local.control_plane_network.name}-bastion"
  network_id = local.control_plane_subnet[0].network_id

  admin_state_up        = true
  no_security_groups    = true
  port_security_enabled = false

  fixed_ip {
    subnet_id = local.control_plane_subnet[0].id
  }

  count = local.bastion.enabled && local.control_plane_network.enabled ? 1 : 0
}
resource "openstack_compute_interface_attach_v2" "control_plane_bastion" {
  count = length(openstack_networking_port_v2.control_plane_bastion)

  instance_id = openstack_compute_instance_v2.bastion[0].id
  port_id     = openstack_networking_port_v2.control_plane_bastion[0].id
}

resource "openstack_networking_port_v2" "workload_plane_bastion" {
  name       = "${local.workload_plane_network.name}-bastion"
  network_id = local.workload_plane_subnet[0].network_id

  admin_state_up        = true
  no_security_groups    = true
  port_security_enabled = false

  fixed_ip {
    subnet_id = local.workload_plane_subnet[0].id
  }

  count = (
    local.bastion.enabled
    && local.workload_plane_network.enabled
    && ! local.workload_plane_network.reuse_cp
  ) ? 1 : 0
}
resource "openstack_compute_interface_attach_v2" "workload_plane_bastion" {
  count = length(openstack_networking_port_v2.workload_plane_bastion)

  instance_id = openstack_compute_instance_v2.bastion[0].id
  port_id     = openstack_networking_port_v2.workload_plane_bastion[0].id
}

resource "null_resource" "bastion_iface_config" {
  count = local.bastion.enabled ? 1 : 0

  depends_on = [
    openstack_compute_instance_v2.bastion,
    openstack_compute_interface_attach_v2.control_plane_bastion,
    openstack_compute_interface_attach_v2.workload_plane_bastion,
    null_resource.provision_scripts_bastion,
  ]

  triggers = {
    bastion = openstack_compute_instance_v2.bastion[0].id,
    cp_port = (
      local.control_plane_network.enabled
      ? openstack_networking_port_v2.control_plane_bastion[0].id
      : ""
    ),
    wp_port = (
      local.workload_plane_network.enabled
      && ! local.workload_plane_network.reuse_cp
      ? openstack_networking_port_v2.workload_plane_bastion[0].id
      : ""
    )
  }

  connection {
    host        = openstack_compute_instance_v2.bastion[0].access_ip_v4
    type        = "ssh"
    user        = local.bastion.user
    private_key = openstack_compute_keypair_v2.local.private_key
  }

  # Configure network interfaces for private networks
  provisioner "remote-exec" {
    inline = [
      for mac_address in concat(
        local.control_plane_network.enabled
        ? [openstack_networking_port_v2.control_plane_bastion[0].mac_address]
        : [],
        local.workload_plane_network.enabled
        && ! local.workload_plane_network.reuse_cp
        ? [openstack_networking_port_v2.workload_plane_bastion[0].mac_address]
        : [],
      ) :
      "sudo bash /tmp/metalk8s/scripts/network-iface-config.sh ${mac_address}"
    ]
  }
}


# HTTP proxy for selective online access from Bootstrap or Nodes
resource "null_resource" "bastion_http_proxy" {
  count = local.bastion.enabled ? 1 : 0

  depends_on = [openstack_compute_instance_v2.bastion]

  connection {
    host        = openstack_compute_instance_v2.bastion[0].access_ip_v4
    type        = "ssh"
    user        = local.bastion.user
    private_key = openstack_compute_keypair_v2.local.private_key
  }

  # Prepare Squid configuration
  provisioner "file" {
    destination = "/home/centos/squid.conf"
    content = templatefile(
      "${path.module}/templates/squid.conf.tpl",
      {
        src_cidr   = data.openstack_networking_subnet_v2.public_subnet.cidr,
        proxy_port = local.bastion.proxy_port,
      }
    )
  }

  provisioner "remote-exec" {
    inline = [
      # Install Squid
      "sudo yum -y install squid",
      # Configure Squid
      "sudo cp /home/centos/squid.conf /etc/squid/squid.conf",
      "sudo chown root:squid /etc/squid/squid.conf",
      # Enable and start Squid
      "sudo systemctl enable squid",
      "sudo systemctl start squid",
    ]
  }
}
