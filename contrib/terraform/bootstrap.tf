resource "openstack_compute_instance_v2" "bootstrap" {
  name        = "${local.prefix}-bootstrap"
  image_name  = local.os_image
  flavor_name = var.openstack_flavours.bootstrap
  key_pair    = openstack_compute_keypair_v2.local_ssh_key.name

  security_groups = [openstack_networking_secgroup_v2.nodes.name]

  network {
    access_network = true
    name           = data.openstack_networking_network_v2.default_network.name
  }

  connection {
    host        = self.access_ip_v4
    type        = "ssh"
    user        = "centos"
    private_key = file(var.ssh_key_pair.private_key)
  }

  # Provision scripts for remote-execution
  provisioner "file" {
    source      = "${path.root}/scripts"
    destination = "/home/centos/scripts"
  }

  provisioner "remote-exec" {
    inline = ["chmod -R +x /home/centos/scripts"]
  }

  # Configure RedHat Subscription Manager if enabled
  provisioner "remote-exec" {
    inline = [
      var.openstack_use_os == "redhat" ? join(" ", [
        "sudo bash scripts/rhsm-register.sh",
        "'${var.rhsm_username}' '${var.rhsm_password}'",
      ]) : "echo 'Nothing to do, not configured to use RHEL.'"
    ]
  }

  provisioner "remote-exec" {
    when       = destroy
    on_failure = continue
    inline = [
      var.openstack_use_os == "redhat"
      ? "sudo subscription-manager unregister"
      : "",
    ]
  }

  # Generate an SSH keypair
  provisioner "remote-exec" {
    inline = [
      "ssh-keygen -t rsa -b 4096 -N '' -f /home/centos/.ssh/bootstrap"
    ]
  }
}

locals {
  bootstrap_ip = openstack_compute_instance_v2.bootstrap.access_ip_v4
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
  count = local.control_plane_network.enabled ? 1 : 0

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

  count = local.workload_plane_network.enabled ? 1 : 0
}
resource "openstack_compute_interface_attach_v2" "workload_plane_bootstrap" {
  count = local.workload_plane_network.enabled ? 1 : 0

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
      ? openstack_networking_port_v2.workload_plane_bootstrap[0].id
      : ""
    )
  }

  connection {
    host        = openstack_compute_instance_v2.bootstrap.access_ip_v4
    type        = "ssh"
    user        = "centos"
    private_key = file(var.ssh_key_pair.private_key)
  }

  # Configure network interfaces for private networks
  provisioner "remote-exec" {
    inline = [
      for mac_address in concat(
        local.control_plane_network.enabled
        ? [openstack_networking_port_v2.control_plane_bootstrap[0].mac_address]
        : [],
        local.workload_plane_network.enabled
        ? [openstack_networking_port_v2.workload_plane_bootstrap[0].mac_address]
        : [],
      ) :
      "sudo bash scripts/network-iface-config.sh ${mac_address}"
    ]
  }
}

resource "null_resource" "bootstrap_use_proxy" {
  count = local.bastion.enabled ? 1 : 0

  triggers = {
    bootstrap = openstack_compute_instance_v2.bootstrap.id,
    bastion = openstack_compute_instance_v2.bastion[0].id,
  }

  depends_on = [
    openstack_compute_instance_v2.bootstrap,
    null_resource.bastion_http_proxy,
  ]

  connection {
    host        = openstack_compute_instance_v2.bootstrap.access_ip_v4
    type        = "ssh"
    user        = "centos"
    private_key = file(var.ssh_key_pair.private_key)
  }

  provisioner "remote-exec" {
    inline = [
      join(" ", [
        "sudo python scripts/set_yum_proxy.py",
        "http://${local.bastion_ip}:${local.bastion.proxy_port}",
      ]),
    ]
  }
}
