# Default CI network
variable "openstack_network" {
  type = "map"
  default = {
    name = "tenantnetwork1"
  }
}

resource "openstack_networking_secgroup_v2" "nodes" {
  name        = "${local.prefix}-nodes"
  description = "security group for reaching out metalk8s nodes"
}

resource "openstack_networking_secgroup_rule_v2" "nodes_ssh" {
  direction         = "ingress"
  ethertype         = "IPv4"
  protocol          = "tcp"
  port_range_min    = 22
  port_range_max    = 22
  remote_ip_prefix  = "0.0.0.0/0"
  security_group_id = "${openstack_networking_secgroup_v2.nodes.id}"
}

resource "openstack_networking_secgroup_rule_v2" "nodes_icmp" {
  direction         = "ingress"
  ethertype         = "IPv4"
  protocol          = "icmp"
  remote_ip_prefix  = "0.0.0.0/0"
  security_group_id = "${openstack_networking_secgroup_v2.nodes.id}"
}

# Main network for nodes
variable "internal_network_range" {
  type = "string"
  default = "192.168.42.0/24"
}

resource "openstack_networking_network_v2" "internal" {
  name           = "${local.prefix}-internal"
  admin_state_up = "true"
}

resource "openstack_networking_subnet_v2" "internal_main" {
  name       = "${local.prefix}-internal-main"
  network_id = "${openstack_networking_network_v2.internal.id}"
  cidr       = "${var.internal_network_range}"
  ip_version = 4
}

resource "openstack_compute_secgroup_v2" "nodes_openbar" {
  name        = "${local.prefix}-nodes-openbar"
  description = "security group for metalk8s nodes communicating together"

  rule {
    from_port   = 1
    to_port     = 65535
    ip_protocol = "tcp"
    cidr        = "${var.internal_network_range}"
  }
}
