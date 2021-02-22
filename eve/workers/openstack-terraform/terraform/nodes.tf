# Bastion

resource "openstack_networking_port_v2" "bastion_public" {
  name                = "${local.prefix}-bastion-public"
  network_id          = data.openstack_networking_network_v2.default_network.id
  security_group_ids  = [
    openstack_networking_secgroup_v2.ingress.id,
    openstack_networking_secgroup_v2.open_egress.id
  ]
}

resource "openstack_networking_port_v2" "bastion_control_plane" {
  name        = "${local.prefix}-bastion-control-plane"
  network_id  = openstack_networking_network_v2.control_plane.id
  fixed_ip {
    subnet_id   = openstack_networking_subnet_v2.control_plane.id
    ip_address  = "192.168.1.99"
  }
}

resource "openstack_networking_port_v2" "bastion_workload_plane" {
  name        = "${local.prefix}-bastion-workload-plane"
  network_id  = openstack_networking_network_v2.workload_plane.id
  fixed_ip {
    subnet_id   = openstack_networking_subnet_v2.workload_plane.id
    ip_address  = "192.168.2.99"
  }
}

resource "openstack_compute_instance_v2" "bastion" {
  name        = "${local.prefix}-bastion"
  image_name  = local.bastion_image
  flavor_name = var.openstack_flavour_name
  key_pair    = openstack_compute_keypair_v2.local_ssh_key.name

  network {
    port            = openstack_networking_port_v2.bastion_public.id
    access_network  = true
  }
  network {
    port  = openstack_networking_port_v2.bastion_control_plane.id
  }
  network {
    port  = openstack_networking_port_v2.bastion_workload_plane.id
  }

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

  # Start interfaces for Control and Workload plane
  provisioner "remote-exec" {
    inline = [
      "sudo chmod +x scripts/network.sh",
      "sudo scripts/network.sh eth1",
      "sudo scripts/network.sh eth2",
      "sudo systemctl restart network || sudo systemctl restart NetworkManager"
    ]
  }

  # Install Cypress requirements
  provisioner "remote-exec" {
    inline = [
      "sudo chmod +x scripts/cypress-requirements.sh",
      "scripts/cypress-requirements.sh"
    ]
  }

  # Install basic dependencies for running end-to-end tests
  provisioner "remote-exec" {
    inline = [
      "sudo yum install -y epel-release",
      "sudo yum install -y python36-pip git",
      "sudo pip3.6 install tox",
    ]
  }

  # Generate Bastion SSH keypair
  provisioner "remote-exec" {
    inline = [
      "ssh-keygen -t rsa -b 4096 -N '' -f /home/centos/.ssh/bastion",
    ]
  }
}

# Bootstrap

resource "openstack_networking_port_v2" "bootstrap_public" {
  name                = "${local.prefix}-bootstrap-public"
  network_id          = data.openstack_networking_network_v2.default_network.id
  security_group_ids  = [
    openstack_networking_secgroup_v2.ingress.id,
    openstack_networking_secgroup_v2.open_egress.id
  ]
}

resource "openstack_networking_port_v2" "bootstrap_control_plane" {
  name        = "${local.prefix}-bootstrap-control-plane"
  network_id  = openstack_networking_network_v2.control_plane.id
  fixed_ip {
    subnet_id   = openstack_networking_subnet_v2.control_plane.id
    ip_address  = "192.168.1.100"
  }
}

resource "openstack_networking_port_v2" "bootstrap_workload_plane" {
  name        = "${local.prefix}-bootstrap-workload-plane"
  network_id  = openstack_networking_network_v2.workload_plane.id
  fixed_ip {
    subnet_id   = openstack_networking_subnet_v2.workload_plane.id
    ip_address  = "192.168.2.100"
  }
}

resource "openstack_compute_instance_v2" "bootstrap" {
  name        = "${local.prefix}-bootstrap"
  image_name  = local.bootstrap_image
  flavor_name = "m1.large"
  key_pair    = openstack_compute_keypair_v2.local_ssh_key.name

  network {
    port            = openstack_networking_port_v2.bootstrap_public.id
    access_network  = true
  }
  network {
    port  = openstack_networking_port_v2.bootstrap_control_plane.id
  }
  network {
    port  = openstack_networking_port_v2.bootstrap_workload_plane.id
  }

  connection {
    host        = self.access_ip_v4
    type        = "ssh"
    user        = local.ssh_user
    private_key = file("~/.ssh/terraform")
  }

  # Provision scripts for remote-execution
  provisioner "file" {
    source      = "${path.module}/scripts"
    destination = "/home/${local.ssh_user}/scripts"
  }

  # Start interfaces for Control and Workload plane
  provisioner "remote-exec" {
    inline = [
      "sudo chmod +x scripts/network.sh",
      "sudo scripts/network.sh eth1",
      "sudo scripts/network.sh eth2",
      "sudo systemctl restart network || sudo systemctl restart NetworkManager"
    ]
  }

  # Register RHSM if OS = rhel
  provisioner "remote-exec" {
    inline = [
      "case '${var.os}' in rhel-*) sudo chmod +x scripts/rhsm-register.sh;; esac",
      "case '${var.os}' in rhel-*) sudo scripts/rhsm-register.sh '${var.rhsm_username}' '${var.rhsm_password}';; esac"
    ]
  }

  provisioner "remote-exec" {
    when = destroy
    on_failure = continue
    inline = [
      "case '${var.os}' in rhel-*) sudo subscription-manager unregister;; esac"
    ]
  }
}

# Nodes

resource "openstack_networking_port_v2" "nodes_public" {
  name                = "${local.prefix}-node-${count.index + 1}-public"
  network_id          = data.openstack_networking_network_v2.default_network.id
  security_group_ids  = [
    openstack_networking_secgroup_v2.ingress.id,
    openstack_networking_secgroup_v2.open_egress.id
  ]
  count               = var.nodes_count
}

resource "openstack_networking_port_v2" "nodes_control_plane" {
  name        = "${local.prefix}-node-${count.index + 1}-control-plane"
  network_id  = openstack_networking_network_v2.control_plane.id
  fixed_ip {
    subnet_id   = openstack_networking_subnet_v2.control_plane.id
    ip_address  = "192.168.1.${100 + count.index + 1}"
  }
  count       = var.nodes_count
}

resource "openstack_networking_port_v2" "nodes_workload_plane" {
  name        = "${local.prefix}-node-${count.index + 1}-workload-plane"
  network_id  = openstack_networking_network_v2.workload_plane.id
  fixed_ip {
    subnet_id   = openstack_networking_subnet_v2.workload_plane.id
    ip_address  = "192.168.2.${100 + count.index + 1}"
  }
  count       = var.nodes_count
}


resource "openstack_compute_instance_v2" "nodes" {
  name        = "${local.prefix}-node-${count.index + 1}"
  image_name  = local.nodes_image[count.index]
  flavor_name = var.openstack_flavour_name
  key_pair    = openstack_compute_keypair_v2.local_ssh_key.name

  network {
    port            = openstack_networking_port_v2.nodes_public[count.index].id
    access_network  = true
  }
  network {
    port  = openstack_networking_port_v2.nodes_control_plane[count.index].id
  }
  network {
    port  = openstack_networking_port_v2.nodes_workload_plane[count.index].id
  }

  connection {
    host        = self.access_ip_v4
    type        = "ssh"
    user        = local.ssh_user
    private_key = file("~/.ssh/terraform")
  }

  # Provision scripts for remote-execution
  provisioner "file" {
    source      = "${path.module}/scripts"
    destination = "/home/${local.ssh_user}/scripts"
  }

  # Start interfaces for Control and Workload plane
  provisioner "remote-exec" {
    inline = [
      "sudo chmod +x scripts/network.sh",
      "sudo scripts/network.sh eth1",
      "sudo scripts/network.sh eth2",
      "sudo systemctl restart network || sudo systemctl restart NetworkManager"
    ]
  }

  # Register RHSM if OS = rhel
  provisioner "remote-exec" {
    inline = [
      "case '${var.os}' in rhel-*) sudo chmod +x scripts/rhsm-register.sh;; esac",
      "case '${var.os}' in rhel-*) sudo scripts/rhsm-register.sh '${var.rhsm_username}' '${var.rhsm_password}';; esac"
    ]
  }

  provisioner "remote-exec" {
    when = destroy
    on_failure = continue
    inline = [
      "case '${var.os}' in rhel-*) sudo subscription-manager unregister;; esac"
    ]
  }

  count = var.nodes_count
}

locals {
  bastion_ip   = openstack_compute_instance_v2.bastion.access_ip_v4
  bootstrap_ip = openstack_compute_instance_v2.bootstrap.access_ip_v4

  nodes = [
    for index, node in openstack_compute_instance_v2.nodes :
    { name = "node-${index + 1}", ip = node.access_ip_v4 }
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

output "ids" {
  value = {
    bastion   = openstack_compute_instance_v2.bastion.id
    bootstrap = openstack_compute_instance_v2.bootstrap.id
    nodes     = openstack_compute_instance_v2.nodes.*.id
  }
}
