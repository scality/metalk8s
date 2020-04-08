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

resource "openstack_networking_secgroup_v2" "nodes" {
  name        = "${local.prefix}-nodes"
  description = "Security group for the nodes"
}

resource "openstack_networking_secgroup_rule_v2" "nodes_ingress" {
  direction         = "ingress"
  ethertype         = "IPv4"
  remote_ip_prefix  = "0.0.0.0/0"
  security_group_id = openstack_networking_secgroup_v2.nodes.id
}
