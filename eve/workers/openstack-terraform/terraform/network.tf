# Default CI network
data "openstack_networking_network_v2" "default_network" {
  name = "tenantnetwork1"
}

# Control Plane

resource "openstack_networking_network_v2" "control_plane" {
  name                    = "${local.prefix}-control-plane"
  port_security_enabled   = false
}

resource "openstack_networking_subnet_v2" "control_plane" {
  name        = "${local.prefix}-control-plane-subnet"
  network_id  = openstack_networking_network_v2.control_plane.id
  cidr        = "192.168.1.0/24"
  ip_version  = 4
}

# Workload Plane

resource "openstack_networking_network_v2" "workload_plane" {
  name                    = "${local.prefix}-workload-plane"
  port_security_enabled   = false
}

resource "openstack_networking_subnet_v2" "workload_plane" {
  name        = "${local.prefix}-workload-plane-subnet"
  network_id  = openstack_networking_network_v2.workload_plane.id
  cidr        = "192.168.2.0/24"
  ip_version  = 4
}


# Security groups
resource "openstack_networking_secgroup_v2" "ingress" {
  name                 = "${local.prefix}-ingress"
  delete_default_rules = true
}

resource "openstack_networking_secgroup_rule_v2" "ingress_ssh" {
  direction         = "ingress"
  ethertype         = "IPv4"
  protocol          = "tcp"
  port_range_min    = 22
  port_range_max    = 22
  remote_ip_prefix  = "0.0.0.0/0"
  security_group_id = openstack_networking_secgroup_v2.ingress.id
}

resource "openstack_networking_secgroup_rule_v2" "ingress_icmp" {
  direction         = "ingress"
  ethertype         = "IPv4"
  protocol          = "icmp"
  remote_ip_prefix  = "0.0.0.0/0"
  security_group_id = openstack_networking_secgroup_v2.ingress.id
}

resource "openstack_networking_secgroup_rule_v2" "ingress_ingress" {
  direction         = "ingress"
  ethertype         = "IPv4"
  remote_group_id   = openstack_networking_secgroup_v2.ingress.id
  security_group_id = openstack_networking_secgroup_v2.ingress.id
}

resource "openstack_networking_secgroup_rule_v2" "ingress_egress" {
  direction         = "egress"
  ethertype         = "IPv4"
  remote_group_id   = openstack_networking_secgroup_v2.ingress.id
  security_group_id = openstack_networking_secgroup_v2.ingress.id
}

resource "openstack_networking_secgroup_v2" "open_egress" {
  name                 = "${local.prefix}-open-egress"
}
