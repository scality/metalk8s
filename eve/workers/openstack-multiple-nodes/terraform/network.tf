# Variables

# Default CI network
variable "openstack_network" {
  type = map(string)
  default = {
    name = "tenantnetwork1"
  }
}

# Default internal networks
variable "control_plane_cidr" {
  type    = string
  default = "172.42.254.0/28"
}

variable "workload_plane_cidr" {
  type    = string
  default = "172.42.254.32/27"
}


# Networks and subnets

resource "openstack_networking_network_v2" "control_plane" {
  name           = "${local.prefix}-control-plane"
  admin_state_up = true
}

resource "openstack_networking_subnet_v2" "control_plane_subnet" {
  name       = "${local.prefix}-control-plane-subnet"
  network_id = openstack_networking_network_v2.control_plane.id
  cidr       = var.control_plane_cidr
  ip_version = 4
  no_gateway = true
}

resource "openstack_networking_network_v2" "workload_plane" {
  name           = "${local.prefix}-workload-plane"
  admin_state_up = true
}

resource "openstack_networking_subnet_v2" "workload_plane_subnet" {
  name       = "${local.prefix}-workload-plane-subnet"
  network_id = openstack_networking_network_v2.workload_plane.id
  cidr       = var.workload_plane_cidr
  ip_version = 4
  no_gateway = true
}

locals {
  control_plane_network = {
    name = openstack_networking_network_v2.control_plane.name
  }
  workload_plane_network = {
    name = openstack_networking_network_v2.workload_plane.name
  }
}


# Security groups

# First secgroup for SSH or ping from the outside
resource "openstack_networking_secgroup_v2" "nodes" {
  name        = "${local.prefix}-nodes"
  description = "Security group for reaching MetalK8s nodes from outside"
}

resource "openstack_networking_secgroup_rule_v2" "nodes_ssh" {
  direction         = "ingress"
  ethertype         = "IPv4"
  protocol          = "tcp"
  port_range_min    = 22
  port_range_max    = 22
  remote_ip_prefix  = "0.0.0.0/0"
  security_group_id = openstack_networking_secgroup_v2.nodes.id
}

resource "openstack_networking_secgroup_rule_v2" "nodes_icmp" {
  direction         = "ingress"
  ethertype         = "IPv4"
  protocol          = "icmp"
  remote_ip_prefix  = "0.0.0.0/0"
  security_group_id = openstack_networking_secgroup_v2.nodes.id
}

# Second secgroup for traffic within the control/workload plane subnets
resource "openstack_networking_secgroup_v2" "nodes_internal" {
  name        = "${local.prefix}-nodes-internal"
  description = "Security group for MetalK8s nodes communicating together"
}

resource "openstack_networking_secgroup_rule_v2" "nodes_internal_control" {
  direction         = "ingress"
  ethertype         = "IPv4"
  protocol          = "tcp"
  port_range_min    = 1
  port_range_max    = 65535
  remote_ip_prefix  = var.control_plane_cidr
  security_group_id = openstack_networking_secgroup_v2.nodes_internal.id
}

resource "openstack_networking_secgroup_rule_v2" "nodes_internal_workload" {
  direction         = "ingress"
  ethertype         = "IPv4"
  protocol          = "tcp"
  port_range_min    = 1
  port_range_max    = 65535
  remote_ip_prefix  = var.workload_plane_cidr
  security_group_id = openstack_networking_secgroup_v2.nodes_internal.id
}
