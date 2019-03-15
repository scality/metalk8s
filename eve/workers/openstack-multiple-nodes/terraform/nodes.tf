resource "openstack_compute_instance_v2" "bootstrap" {
  name        = "${local.prefix}-bootstrap"
  image_name  = "${var.openstack_image_name}"
  flavor_name = "${var.openstack_flavour_name}"
  key_pair    = "${openstack_compute_keypair_v2.local_ssh_key.name}"
  security_groups = ["${openstack_networking_secgroup_v2.nodes.name}"]

  network = ["${var.openstack_network}"]
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

  count = "${var.nodes_count}"
}
