output "network" {
  value = openstack_networking_network_v2.network
}

output "subnet" {
  value = openstack_networking_subnet_v2.subnet
}

output "secgroup" {
  value = openstack_networking_secgroup_v2.secgroup
}

output "node_ports" {
  value = openstack_networking_port_v2.node_ports
}

output "bastion_port" {
  value = openstack_networking_port_v2.bastion_port
}

output "vip" {
  value = var.vip
}
