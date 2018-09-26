resource "openstack_compute_servergroup_v2" "etcd" {
  name     = "${var.name_prefix}-masters"
  policies = []
}

resource "openstack_compute_instance_v2" "etcd" {
  name            = "${var.name_prefix}-etcd-${count.index}"
  image_id        = "${data.openstack_images_image_v2.centos7.id}"
  flavor_id       = "${data.openstack_compute_flavor_v2.medium.id}"
  key_pair        = "${data.openstack_compute_keypair_v2.local_ssh_key.name}"

  scheduler_hints {
    group         = "${openstack_compute_servergroup_v2.etcd.id}"
  }
  network         = ["${var.openstack_network}"]
  security_groups = ["${compact(list(
        openstack_networking_secgroup_v2.etcd.name,
        var.masters_dedicated == 1 ? "" : openstack_networking_secgroup_v2.masters.name
  ))}"]
  count           = "${local.etcd_server_count}"
}

resource "openstack_networking_secgroup_v2" "etcd" {
  name        = "${var.name_prefix}-etcd"
  description = "security group for kube-etcd"
}

resource "openstack_networking_secgroup_rule_v2" "etcd_ssh" {
  direction         = "ingress"
  ethertype         = "IPv4"
  protocol          = "tcp"
  port_range_min    = 22
  port_range_max    = 22
  remote_ip_prefix  = "0.0.0.0/0"
  security_group_id = "${openstack_networking_secgroup_v2.etcd.id}"
}

resource "openstack_networking_secgroup_rule_v2" "etcd_inter_cluster" {
  direction         = "ingress"
  ethertype         = "IPv4"
  protocol          = "tcp"
  remote_ip_prefix  = "10.200.0.0/16"
  security_group_id = "${openstack_networking_secgroup_v2.etcd.id}"
}

resource "openstack_networking_secgroup_rule_v2" "masters_to_etcd" {
  direction         = "ingress"
  ethertype         = "IPv4"
  protocol          = "tcp"
  remote_group_id   = "${openstack_networking_secgroup_v2.masters.id}"
  security_group_id = "${openstack_networking_secgroup_v2.etcd.id}"
}

resource "openstack_networking_secgroup_rule_v2" "nodes_to_etcd" {
  direction         = "ingress"
  ethertype         = "IPv4"
  protocol          = "tcp"
  remote_group_id   = "${openstack_networking_secgroup_v2.nodes.id}"
  security_group_id = "${openstack_networking_secgroup_v2.etcd.id}"
}
