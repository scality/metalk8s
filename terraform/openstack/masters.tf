resource "openstack_compute_servergroup_v2" "masters" {
  name     = "${var.name_prefix}-masters"
  policies = []
}

resource "openstack_compute_instance_v2" "masters" {
  name            = "${var.name_prefix}-masters-${count.index}"
  image_id        = "${data.openstack_images_image_v2.centos7.id}"
  flavor_id       = "${data.openstack_compute_flavor_v2.medium.id}"
  key_pair        = "${data.openstack_compute_keypair_v2.local_ssh_key.name}"

  scheduler_hints {
    group         = "${openstack_compute_servergroup_v2.masters.id}"
  }
  network         = ["${var.openstack_network}"]
  security_groups = ["${openstack_networking_secgroup_v2.masters.name}"]
  count           = "${local.masters_server_count}"
}

resource "openstack_networking_secgroup_v2" "masters" {
  name        = "${var.name_prefix}-masters"
  description = "security group for kube-masters"
}

resource "openstack_networking_secgroup_rule_v2" "masters_ssh" {
  direction         = "ingress"
  ethertype         = "IPv4"
  protocol          = "tcp"
  port_range_min    = 22
  port_range_max    = 22
  remote_ip_prefix  = "0.0.0.0/0"
  security_group_id = "${openstack_networking_secgroup_v2.masters.id}"
}

resource "openstack_networking_secgroup_rule_v2" "master_apiserver" {
  direction         = "ingress"
  ethertype         = "IPv4"
  protocol          = "tcp"
  port_range_min    = 6443
  port_range_max    = 6443
  remote_ip_prefix  = "0.0.0.0/0"
  security_group_id = "${openstack_networking_secgroup_v2.masters.id}"
}

resource "openstack_networking_secgroup_rule_v2" "nodes_to_masters" {
  direction         = "ingress"
  ethertype         = "IPv4"
  protocol          = "tcp"
  remote_group_id   = "${openstack_networking_secgroup_v2.nodes.id}"
  security_group_id = "${openstack_networking_secgroup_v2.masters.id}"
}

resource "openstack_networking_secgroup_rule_v2" "etcd_to_masters" {
  direction         = "ingress"
  ethertype         = "IPv4"
  protocol          = "tcp"
  remote_group_id   = "${openstack_networking_secgroup_v2.etcd.id}"
  security_group_id = "${openstack_networking_secgroup_v2.masters.id}"
}
