resource "openstack_compute_servergroup_v2" "proxies" {
  name     = "${var.name_prefix}-proxies"
  policies = []
  count    = "${var.proxies_count >= 1 ? 1 : 0}"
}

resource "openstack_compute_instance_v2" "proxies" {
  name      = "${var.name_prefix}-proxy${var.proxies_count > 1 ? format("-%d", count.index) : ""}"
  image_id  = "${data.openstack_images_image_v2.centos7.id}"
  flavor_id = "${data.openstack_compute_flavor_v2.medium.id}"
  key_pair  = "${data.openstack_compute_keypair_v2.local_ssh_key.name}"

  scheduler_hints {
    group = "${openstack_compute_servergroup_v2.proxies.id}"
  }

  network         = ["${var.openstack_network}"]
  security_groups = ["${openstack_networking_secgroup_v2.proxies.name}"]
  count           = "${var.proxies_count}"
}

resource "openstack_networking_secgroup_v2" "proxies" {
  name        = "${var.name_prefix}-proxies"
  description = "security group for proxies"
  count       = "${var.proxies_count >= 1 ? 1 : 0}"
}

resource "openstack_networking_secgroup_rule_v2" "proxy_ssh" {
  direction         = "ingress"
  ethertype         = "IPv4"
  protocol          = "tcp"
  port_range_min    = 22
  port_range_max    = 22
  remote_ip_prefix  = "0.0.0.0/0"
  security_group_id = "${openstack_networking_secgroup_v2.proxies.id}"
  count             = "${var.proxies_count >= 1 ? 1 : 0}"
}

resource "openstack_networking_secgroup_rule_v2" "etcd_to_proxies" {
  direction         = "ingress"
  ethertype         = "IPv4"
  remote_group_id   = "${openstack_networking_secgroup_v2.etcd.id}"
  security_group_id = "${openstack_networking_secgroup_v2.proxies.id}"
  count             = "${var.proxies_count >= 1 ? 1 : 0}"
}

resource "openstack_networking_secgroup_rule_v2" "masters_to_proxies" {
  direction         = "ingress"
  ethertype         = "IPv4"
  remote_group_id   = "${openstack_networking_secgroup_v2.masters.id}"
  security_group_id = "${openstack_networking_secgroup_v2.proxies.id}"
  count             = "${var.proxies_count >= 1 ? 1 : 0}"
}

resource "openstack_networking_secgroup_rule_v2" "nodes_to_proxies" {
  direction         = "ingress"
  ethertype         = "IPv4"
  remote_group_id   = "${openstack_networking_secgroup_v2.nodes.id}"
  security_group_id = "${openstack_networking_secgroup_v2.proxies.id}"
  count             = "${var.proxies_count >= 1 ? 1 : 0}"
}
