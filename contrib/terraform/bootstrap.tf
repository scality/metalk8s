locals {
  bootstrap = {
    flavour = var.openstack_flavours[var.bootstrap.flavour],
    image   = var.openstack_images[var.bootstrap.image].image,
    user    = var.openstack_images[var.bootstrap.image].user,
  }
}

resource "openstack_compute_instance_v2" "bootstrap" {
  name        = "${local.prefix}-bootstrap"
  image_name  = local.bootstrap.image
  flavor_name = local.bootstrap.flavour
  key_pair    = openstack_compute_keypair_v2.local.name

  security_groups = [openstack_networking_secgroup_v2.nodes.name]

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
    user        = local.bootstrap.user
    private_key = openstack_compute_keypair_v2.local.private_key
  }

  # Provision SSH identities
  provisioner "file" {
    content     = openstack_compute_keypair_v2.bootstrap.public_key
    destination = "/home/${local.bootstrap.user}/.ssh/bootstrap.pub"
  }

  provisioner "file" {
    content     = openstack_compute_keypair_v2.bootstrap.private_key
    destination = "/home/${local.bootstrap.user}/.ssh/bootstrap"
  }

  provisioner "remote-exec" {
    inline = [
      "chmod 600 /home/${local.bootstrap.user}/.ssh/bootstrap*",
      "echo '${openstack_compute_keypair_v2.bastion.public_key}' >> ~/.ssh/authorized_keys",
    ]
  }
}

locals {
  bootstrap_ip = openstack_compute_instance_v2.bootstrap.access_ip_v4
}


# Scripts provisioning
resource "null_resource" "provision_scripts_bootstrap" {
  depends_on = [
    openstack_compute_instance_v2.bootstrap,
  ]

  triggers = {
    bootstrap = openstack_compute_instance_v2.bootstrap.id,
    script_hashes = join(",", compact([
      # List of hashes for scripts that will be used
      local.using_rhel.bootstrap ? local.script_hashes.rhsm_register : "",
      local.script_hashes.iface_config,
      local.bastion.enabled ? local.script_hashes.set_yum_proxy : "",
      local.enable_ipip ? local.script_hashes.enable_ipip : "",
      local.script_hashes.prepare_bootstrap,
    ])),
  }

  connection {
    host        = openstack_compute_instance_v2.bootstrap.access_ip_v4
    type        = "ssh"
    user        = local.bootstrap.user
    private_key = openstack_compute_keypair_v2.local.private_key
  }

  # Provision scripts for remote-execution
  provisioner "remote-exec" {
    inline = ["mkdir -p /tmp/metalk8s/"]
  }

  provisioner "file" {
    source      = "${path.root}/scripts"
    destination = "/tmp/metalk8s/"
  }

  provisioner "remote-exec" {
    inline = ["chmod -R +x /tmp/metalk8s/scripts"]
  }
}

resource "null_resource" "configure_rhsm_bootstrap" {
  # Configure RedHat Subscription Manager if enabled
  count = local.using_rhel.bootstrap ? 1 : 0

  depends_on = [
    openstack_compute_instance_v2.bootstrap,
    null_resource.provision_scripts_bootstrap,
  ]

  connection {
    host        = openstack_compute_instance_v2.bootstrap.access_ip_v4
    type        = "ssh"
    user        = local.bootstrap.user
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
resource "openstack_networking_port_v2" "control_plane_bootstrap" {
  name       = "${local.control_plane_network.name}-bootstrap"
  network_id = local.control_plane_subnet[0].network_id

  depends_on = [
    openstack_compute_instance_v2.bootstrap,
  ]

  admin_state_up        = true
  no_security_groups    = true
  port_security_enabled = false

  fixed_ip {
    subnet_id = local.control_plane_subnet[0].id
  }

  count = local.control_plane_network.enabled ? 1 : 0
}
resource "openstack_compute_interface_attach_v2" "control_plane_bootstrap" {
  count = length(openstack_networking_port_v2.control_plane_bootstrap)

  depends_on = [
    openstack_compute_instance_v2.bootstrap,
  ]

  instance_id = openstack_compute_instance_v2.bootstrap.id
  port_id     = openstack_networking_port_v2.control_plane_bootstrap[0].id
}

resource "openstack_networking_port_v2" "workload_plane_bootstrap" {
  name       = "${local.workload_plane_network.name}-bootstrap"
  network_id = local.workload_plane_subnet[0].network_id

  depends_on = [
    openstack_compute_instance_v2.bootstrap,
  ]

  admin_state_up        = true
  no_security_groups    = true
  port_security_enabled = false

  fixed_ip {
    subnet_id = local.workload_plane_subnet[0].id
  }

  count = (
    local.workload_plane_network.enabled
    && ! local.workload_plane_network.reuse_cp
  ) ? 1 : 0
}
resource "openstack_compute_interface_attach_v2" "workload_plane_bootstrap" {
  count = length(openstack_networking_port_v2.workload_plane_bootstrap)

  depends_on = [
    openstack_compute_instance_v2.bootstrap,
  ]

  instance_id = openstack_compute_instance_v2.bootstrap.id
  port_id     = openstack_networking_port_v2.workload_plane_bootstrap[0].id
}

resource "null_resource" "bootstrap_iface_config" {
  depends_on = [
    openstack_compute_instance_v2.bootstrap,
    openstack_compute_interface_attach_v2.control_plane_bootstrap,
    openstack_compute_interface_attach_v2.workload_plane_bootstrap,
    null_resource.provision_scripts_bootstrap,
  ]

  triggers = {
    bootstrap = openstack_compute_instance_v2.bootstrap.id,
    cp_port = (
      local.control_plane_network.enabled
      ? openstack_networking_port_v2.control_plane_bootstrap[0].id
      : ""
    ),
    wp_port = (
      local.workload_plane_network.enabled
      && ! local.workload_plane_network.reuse_cp
      ? openstack_networking_port_v2.workload_plane_bootstrap[0].id
      : ""
    )
  }

  connection {
    host        = openstack_compute_instance_v2.bootstrap.access_ip_v4
    type        = "ssh"
    user        = local.bootstrap.user
    private_key = openstack_compute_keypair_v2.local.private_key
  }

  # Configure network interfaces for private networks
  provisioner "remote-exec" {
    inline = [
      for mac_address in concat(
        local.control_plane_network.enabled
        ? [openstack_networking_port_v2.control_plane_bootstrap[0].mac_address]
        : [],
        local.workload_plane_network.enabled
        && ! local.workload_plane_network.reuse_cp
        ? [openstack_networking_port_v2.workload_plane_bootstrap[0].mac_address]
        : [],
      ) :
      "sudo bash /tmp/metalk8s/scripts/network-iface-config.sh ${mac_address}"
    ]
  }
}

resource "null_resource" "bootstrap_use_proxy" {
  count = local.bastion.enabled ? 1 : 0

  triggers = {
    bootstrap = openstack_compute_instance_v2.bootstrap.id,
    bastion   = openstack_compute_instance_v2.bastion[0].id,
  }

  depends_on = [
    openstack_compute_instance_v2.bootstrap,
    null_resource.bastion_http_proxy,
    null_resource.provision_scripts_bootstrap,
  ]

  connection {
    host        = openstack_compute_instance_v2.bootstrap.access_ip_v4
    type        = "ssh"
    user        = local.bootstrap.user
    private_key = openstack_compute_keypair_v2.local.private_key
  }

  provisioner "remote-exec" {
    inline = [
      join(" ", [
        "sudo python /tmp/metalk8s/scripts/set_yum_proxy.py",
        "http://${local.bastion_ip}:${local.bastion.proxy_port}",
      ]),
    ]
  }
}
