resource "openstack_compute_instance_v2" "bastion" {
  name        = "${local.prefix}-bastion"
  image_name  = var.openstack_image_name
  flavor_name = var.openstack_flavour_name
  key_pair    = openstack_compute_keypair_v2.local_ssh_key.name

  security_groups = [
    openstack_networking_secgroup_v2.nodes.name,
    openstack_networking_secgroup_v2.nodes_internal.name,
  ]

  dynamic "network" {
    for_each = [
      var.openstack_network,
      local.control_plane_network,
      local.workload_plane_network
    ]

    content {
      name = network.value.name
    }
  }

  # We need the subnets to be created before attempting to reach the DHCP server
  depends_on = [
    openstack_networking_subnet_v2.control_plane_subnet,
    openstack_networking_subnet_v2.workload_plane_subnet,
  ]

  connection {
    host        = self.access_ip_v4
    type        = "ssh"
    user        = "centos"
    private_key = file("~/.ssh/terraform")
  }

  # Provision scripts for remote-execution
  provisioner "file" {
    source      = "${path.module}/scripts"
    destination = "/home/centos/scripts"
  }

  # Obtain IP addresses for both private networks
  provisioner "remote-exec" {
    inline = ["sudo bash scripts/get-ip-leases.sh"]
  }

  # Generate Bastion SSH keypair
  provisioner "remote-exec" {
    inline = [
      "ssh-keygen -t rsa -b 4096 -N '' -f /home/centos/.ssh/bastion",
    ]
  }

  # Install basic dependencies for running end-to-end tests
  provisioner "remote-exec" {
    inline = [
      "sudo yum install -y epel-release",
      "sudo yum install -y python36-pip",
      "sudo pip3.6 install tox",
    ]
  }
}

resource "openstack_compute_instance_v2" "bootstrap" {
  name        = "${local.prefix}-bootstrap"
  image_name  = var.openstack_image_name
  flavor_name = var.openstack_flavour_name
  key_pair    = openstack_compute_keypair_v2.local_ssh_key.name

  security_groups = [
    openstack_networking_secgroup_v2.nodes.name,
    openstack_networking_secgroup_v2.nodes_internal.name,
  ]

  dynamic "network" {
    for_each = [
      var.openstack_network,
      local.control_plane_network,
      local.workload_plane_network
    ]

    content {
      name = network.value.name
    }
  }

  # We need the subnets before attempting to reach their DHCP servers
  depends_on = [
    openstack_networking_subnet_v2.control_plane_subnet,
    openstack_networking_subnet_v2.workload_plane_subnet,
  ]

  connection {
    host        = self.access_ip_v4
    type        = "ssh"
    user        = "centos"
    private_key = file("~/.ssh/terraform")
  }

  # Provision scripts for remote-execution
  provisioner "file" {
    source      = "${path.module}/scripts"
    destination = "/home/centos/scripts"
  }

  # Obtain IP addresses for both private networks
  provisioner "remote-exec" {
    inline = ["sudo bash scripts/get-ip-leases.sh"]
  }

  # Generate BootstrapConfiguration
  provisioner "remote-exec" {
    inline = ["sudo bash scripts/bootstrap-config.sh"]
  }
}

variable "nodes_count" {
  type    = string
  default = "1"
}

resource "openstack_compute_instance_v2" "nodes" {
  name        = "${local.prefix}-node-${count.index + 1}"
  image_name  = var.openstack_image_name
  flavor_name = var.openstack_flavour_name
  key_pair    = openstack_compute_keypair_v2.local_ssh_key.name

  security_groups = [
    openstack_networking_secgroup_v2.nodes.name,
    openstack_networking_secgroup_v2.nodes_internal.name,
  ]

  dynamic "network" {
    for_each = [
      var.openstack_network,
      local.control_plane_network,
      local.workload_plane_network
    ]

    content {
      name = network.value.name
    }
  }

  # We need the subnets to be created before attempting to reach the DHCP server
  depends_on = [
    openstack_networking_subnet_v2.control_plane_subnet,
    openstack_networking_subnet_v2.workload_plane_subnet,
  ]

  connection {
    host        = self.access_ip_v4
    type        = "ssh"
    user        = "centos"
    private_key = file("~/.ssh/terraform")
  }

  # Provision scripts for remote-execution
  provisioner "file" {
    source      = "${path.module}/scripts"
    destination = "/home/centos/scripts"
  }

  # Obtain IP addresses for both private networks
  provisioner "remote-exec" {
    inline = ["sudo bash scripts/get-ip-leases.sh"]
  }

  count = var.nodes_count
}

locals {
  bastion_ip   = openstack_compute_instance_v2.bastion.access_ip_v4
  bootstrap_ip = openstack_compute_instance_v2.bootstrap.access_ip_v4

  nodes = [
    for index, node in openstack_compute_instance_v2.nodes :
    { name = "node${index + 1}", ip = node.access_ip_v4 }
  ]

  all_instances = concat(
    [
      openstack_compute_instance_v2.bastion.id,
      openstack_compute_instance_v2.bootstrap.id,
    ],
    openstack_compute_instance_v2.nodes.*.id,
  )
}


output "ips" {
  value = {
    bastion   = local.bastion_ip
    bootstrap = local.bootstrap_ip
    nodes     = [for node in local.nodes : node.ip]
  }
}
