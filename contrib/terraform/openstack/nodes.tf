
resource "openstack_compute_servergroup_v2" "nodes" {
  name     = "${var.name_prefix}-nodes"
  policies = []
}

resource "openstack_compute_instance_v2" "nodes" {
  name            = "${var.name_prefix}-node-${count.index}"
  image_id        = "${data.openstack_images_image_v2.centos7.id}"
  flavor_id       = "${data.openstack_compute_flavor_v2.large.id}"
  key_pair        = "${data.openstack_compute_keypair_v2.local_ssh_key.name}"

  scheduler_hints {
    group         = "${openstack_compute_servergroup_v2.nodes.id}"
  }
  network         = ["${var.openstack_network}"]

  security_groups = ["${compact(list(
            openstack_networking_secgroup_v2.nodes.name,
            var.masters_dedicated || var.etcd_dedicated
            ? "" : openstack_networking_secgroup_v2.masters.name,
            var.etcd_dedicated == 1 ? "" : openstack_networking_secgroup_v2.etcd.name
  ))}"]
  count           = "${local.nodes_server_count}"
}

resource "openstack_blockstorage_volume_v2" "nodes_volume" {
  name  = "${var.name_prefix}-node-${element(openstack_compute_instance_v2.nodes.*.name, count.index)}"
  size  = "${var.volume_size}"
  count = "${local.nodes_server_count}"
}

resource "openstack_compute_volume_attach_v2" "nodes_attach" {
  instance_id  = "${element(openstack_compute_instance_v2.nodes.*.id, count.index)}"
  volume_id    = "${element(openstack_blockstorage_volume_v2.nodes_volume.*.id, count.index)}"

  count        = "${local.nodes_server_count}"
}

resource "openstack_networking_secgroup_v2" "nodes" {
  name        = "${var.name_prefix}-node"
  description = "security group for kube-nodes"
}

resource "openstack_networking_secgroup_rule_v2" "node_ssh" {
  direction         = "ingress"
  ethertype         = "IPv4"
  protocol          = "tcp"
  port_range_min    = 22
  port_range_max    = 22
  remote_ip_prefix  = "0.0.0.0/0"
  security_group_id = "${openstack_networking_secgroup_v2.nodes.id}"
}

resource "openstack_networking_secgroup_rule_v2" "node_ingress_http" {
  direction         = "ingress"
  ethertype         = "IPv4"
  protocol          = "tcp"
  port_range_min    = 80
  port_range_max    = 80
  remote_ip_prefix  = "0.0.0.0/0"
  security_group_id = "${openstack_networking_secgroup_v2.nodes.id}"
}

resource "openstack_networking_secgroup_rule_v2" "node_ingress_https" {
  direction         = "ingress"
  ethertype         = "IPv4"
  protocol          = "tcp"
  port_range_min    = 443
  port_range_max    = 443
  remote_ip_prefix  = "0.0.0.0/0"
  security_group_id = "${openstack_networking_secgroup_v2.nodes.id}"
}

resource "openstack_networking_secgroup_rule_v2" "masters_to_nodes" {
  direction         = "ingress"
  ethertype         = "IPv4"
  protocol          = "tcp"
  remote_group_id   = "${openstack_networking_secgroup_v2.masters.id}"
  security_group_id = "${openstack_networking_secgroup_v2.nodes.id}"
}

resource "openstack_networking_secgroup_rule_v2" "etcd_to_nodes" {
  direction         = "ingress"
  ethertype         = "IPv4"
  protocol          = "tcp"
  remote_group_id   = "${openstack_networking_secgroup_v2.etcd.id}"
  security_group_id = "${openstack_networking_secgroup_v2.nodes.id}"
}
