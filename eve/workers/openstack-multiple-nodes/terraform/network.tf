# Default CI network
variable "openstack_network" {
  type = map(string)
  default = {
    name = "tenantnetwork1"
  }
}

data "openstack_networking_network_v2" "default_network" {
  name = var.openstack_network.name
}

data "openstack_networking_subnet_v2" "default_subnet" {
  network_id = data.openstack_networking_network_v2.default_network.id
}

locals {
  dns_servers = tolist(
    data.openstack_networking_subnet_v2.default_subnet.dns_nameservers
  )
}

# Metadata service used by cloud-init
# https://docs.openstack.org/nova/latest/user/metadata-service.html
variable "openstack_link_local_ip" {
  type    = string
  default = "169.254.169.254"
}


# Security groups
resource "openstack_networking_secgroup_v2" "nodes" {
  name                 = "${local.prefix}-nodes"
  description          = "Security group for MetalK8s nodes"
  delete_default_rules = true # Removes default (open) egress rules
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

resource "openstack_networking_secgroup_rule_v2" "nodes_ingress" {
  direction         = "ingress"
  ethertype         = "IPv4"
  remote_group_id   = openstack_networking_secgroup_v2.nodes.id
  security_group_id = openstack_networking_secgroup_v2.nodes.id
}

resource "openstack_networking_secgroup_rule_v2" "nodes_egress" {
  direction         = "egress"
  ethertype         = "IPv4"
  remote_group_id   = openstack_networking_secgroup_v2.nodes.id
  security_group_id = openstack_networking_secgroup_v2.nodes.id
}

resource "openstack_networking_secgroup_rule_v2" "link_local_egress" {
  direction         = "egress"
  ethertype         = "IPv4"
  protocol          = "tcp"
  port_range_min    = 80
  port_range_max    = 80
  remote_ip_prefix  = "${var.openstack_link_local_ip}/32"
  security_group_id = openstack_networking_secgroup_v2.nodes.id
}

resource "openstack_networking_secgroup_rule_v2" "dns_egress" {
  direction         = "egress"
  ethertype         = "IPv4"
  protocol          = "udp"
  port_range_min    = 53
  port_range_max    = 53
  remote_ip_prefix  = "${element(local.dns_servers, count.index)}/32"
  security_group_id = openstack_networking_secgroup_v2.nodes.id

  count = length(local.dns_servers)
}

# Use the default rules for the Bastion so it remains online
resource "openstack_networking_secgroup_v2" "bastion" {
  name        = "${local.prefix}-bastion"
  description = "Security group for the Bastion VM"
}
