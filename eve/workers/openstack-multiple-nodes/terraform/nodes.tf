resource "openstack_compute_instance_v2" "bootstrap" {
  name        = "${local.prefix}-bootstrap"
  image_name  = "${var.openstack_image_name}"
  flavor_name = "${var.openstack_flavour_name}"
  key_pair    = "${openstack_compute_keypair_v2.local_ssh_key.name}"
  security_groups = ["${openstack_networking_secgroup_v2.nodes.name}"]

  network = ["${var.openstack_network}"]

  network {
    name = "${openstack_networking_network_v2.internal.name}"
  }

  provisioner "remote-exec" {
    inline = [
      "sudo chattr +i /etc/resolv.conf &&",
      "sudo dhclient eth1"
    ]
    connection {
      user     = "centos"
      private_key = "${file("/home/eve/.ssh/terraform")}"
    }
  }
}

output "bootstrap_ip" {
  value = "${openstack_compute_instance_v2.bootstrap.network.0.fixed_ip_v4}"
}

variable "nodes_count" {
  type    = "string"
  default = "1"
}

resource "openstack_compute_instance_v2" "nodes" {
  name        = "${local.prefix}-node-${count.index+1}"
  image_name  = "${var.openstack_image_name}"
  flavor_name = "${var.openstack_flavour_name}"
  key_pair    = "${openstack_compute_keypair_v2.local_ssh_key.name}"
  security_groups = ["${openstack_networking_secgroup_v2.nodes.name}"]

  network = ["${var.openstack_network}"]

  network {
    name = "${openstack_networking_network_v2.internal.name}"
  }

  provisioner "remote-exec" {
    inline = [
      "sudo chattr +i /etc/resolv.conf &&",
      "sudo dhclient eth1"
    ]
    connection {
      user     = "centos"
      private_key = "${file("/home/eve/.ssh/terraform")}"
    }
  }

  count = "${var.nodes_count}"
}
