resource "openstack_compute_instance_v2" "nodes" {
  count = var.nodes_count

  name        = "${local.prefix}-node-${count.index + 1}"
  image_name  = var.openstack_image_name
  flavor_name = var.openstack_flavours.nodes
  key_pair    = openstack_compute_keypair_v2.local_ssh_key.name

  scheduler_hints {
    group = openstack_compute_servergroup_v2.all_machines.id
  }

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
    source      = "${path.module}/scripts"
    destination = "/home/centos/scripts"
  }

  provisioner "remote-exec" {
    inline = ["chmod -R +x /home/centos/scripts"]
  }
}

locals {
  node_ips = [
    for node in openstack_compute_instance_v2.nodes : node.access_ip_v4
  ]
}


# Ports on private networks
resource "openstack_networking_port_v2" "control_plane_nodes" {
  name       = "${local.control_plane_network.name}-node-${count.index}"
  network_id = local.control_plane_subnet[0].network_id

  admin_state_up        = true
  no_security_groups    = true
  port_security_enabled = false

  fixed_ip {
    subnet_id = local.control_plane_subnet[0].id
  }

  count = local.control_plane_network.enabled ? var.nodes_count : 0
}

resource "openstack_compute_interface_attach_v2" "control_plane_nodes" {
  count = local.control_plane_network.enabled ? var.nodes_count : 0

  instance_id = openstack_compute_instance_v2.nodes[count.index].id
  port_id     = openstack_networking_port_v2.control_plane_nodes[count.index].id
}

resource "openstack_networking_port_v2" "workload_plane_nodes" {
  name       = "${local.workload_plane_network.name}-node-${count.index}"
  network_id = local.workload_plane_subnet[0].network_id

  admin_state_up        = true
  no_security_groups    = true
  port_security_enabled = false

  fixed_ip {
    subnet_id = local.workload_plane_subnet[0].id
  }

  count = local.workload_plane_network.enabled ? var.nodes_count : 0
}

resource "openstack_compute_interface_attach_v2" "workload_plane_nodes" {
  count = local.workload_plane_network.enabled ? var.nodes_count : 0

  instance_id = openstack_compute_instance_v2.nodes[count.index].id
  port_id     = openstack_networking_port_v2.workload_plane_nodes[count.index].id
}

resource "null_resource" "nodes_iface_config" {
  count = var.nodes_count

  depends_on = [
    openstack_compute_interface_attach_v2.control_plane_nodes,
    openstack_compute_interface_attach_v2.workload_plane_nodes,
  ]

  triggers = {
    node = openstack_compute_instance_v2.nodes[count.index].id,
    cp_port = (
      local.control_plane_network.enabled
      ? openstack_networking_port_v2.control_plane_nodes[count.index].id
      : ""
    ),
    wp_port = (
      local.workload_plane_network.enabled
      ? openstack_networking_port_v2.workload_plane_nodes[count.index].id
      : ""
    )
  }

  connection {
    host        = openstack_compute_instance_v2.nodes[count.index].access_ip_v4
    type        = "ssh"
    user        = "centos"
    private_key = file(var.ssh_key_pair.private_key)
  }

  # Configure network interfaces for private networks
  provisioner "remote-exec" {
    inline = [
      for iface in concat(
        local.control_plane_network.enabled
        ? [local.control_plane_network.iface]
        : [],
        local.workload_plane_network.enabled
        ? [local.workload_plane_network.iface]
        : [],
      ) :
      "sudo bash scripts/network-iface-config.sh ${iface}"
    ]
  }
}

resource "null_resource" "nodes_use_proxy" {
  count = local.bastion.enabled ? var.nodes_count : 0

  depends_on = [
    null_resource.bastion_http_proxy,
  ]

  connection {
    host        = openstack_compute_instance_v2.nodes[count.index].access_ip_v4
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
