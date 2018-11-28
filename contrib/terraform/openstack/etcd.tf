resource "openstack_compute_servergroup_v2" "etcd" {
  name     = "${var.name_prefix}-etcd"
  policies = []
  count    = "${local.etcd_server_count >= 1 ? 1 : 0}"
}

resource "openstack_compute_instance_v2" "etcd" {
  name      = "${var.name_prefix}-etcd-${count.index}"
  image_id  = "${data.openstack_images_image_v2.centos7.id}"
  flavor_id = "${data.openstack_compute_flavor_v2.medium.id}"
  key_pair  = "${data.openstack_compute_keypair_v2.local_ssh_key.name}"

  scheduler_hints {
    group = "${openstack_compute_servergroup_v2.etcd.id}"
  }

  network = ["${var.openstack_network}"]

  security_groups = ["${compact(list(
        openstack_networking_secgroup_v2.common.name,
        openstack_networking_secgroup_v2.etcd.name,
        var.masters_dedicated == 1 ? "" : openstack_networking_secgroup_v2.masters.name
  ))}"]

  count = "${local.etcd_server_count}"
}

resource "openstack_networking_secgroup_v2" "etcd" {
  name                 = "${var.name_prefix}-etcd"
  description          = "security group for kube-etcd"
  delete_default_rules = true
}

resource "openstack_networking_secgroup_rule_v2" "masters_to_etcd" {
  direction         = "ingress"
  ethertype         = "IPv4"
  remote_group_id   = "${openstack_networking_secgroup_v2.masters.id}"
  security_group_id = "${openstack_networking_secgroup_v2.etcd.id}"
}

resource "openstack_networking_secgroup_rule_v2" "nodes_to_etcd" {
  direction         = "ingress"
  ethertype         = "IPv4"
  remote_group_id   = "${openstack_networking_secgroup_v2.nodes.id}"
  security_group_id = "${openstack_networking_secgroup_v2.etcd.id}"
}

resource "openstack_networking_secgroup_rule_v2" "etcd_to_etcd" {
  direction         = "ingress"
  ethertype         = "IPv4"
  remote_group_id   = "${openstack_networking_secgroup_v2.etcd.id}"
  security_group_id = "${openstack_networking_secgroup_v2.etcd.id}"
}

# egress when default egress rules are removed
resource "openstack_networking_secgroup_rule_v2" "etcd_to_etcd_egress" {
  direction         = "egress"
  ethertype         = "IPv4"
  remote_group_id   = "${openstack_networking_secgroup_v2.etcd.id}"
  security_group_id = "${openstack_networking_secgroup_v2.etcd.id}"
  count             = "${local.egress_blocked ? 1 : 0}"
}
