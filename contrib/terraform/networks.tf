# Default network
data "openstack_networking_network_v2" "default_network" {
  name = var.default_network
}

data "openstack_networking_subnet_v2" "default_subnet" {
  network_id = data.openstack_networking_network_v2.default_network.id
}
