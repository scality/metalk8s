# Access network
data "openstack_networking_network_v2" "access_network" {
  name       = var.access_network.name != "" ? var.access_network.name : ""
  network_id = var.access_network.id != "" ? var.access_network.id : ""
}

data "openstack_networking_subnet_v2" "access_subnet" {
  network_id = data.openstack_networking_network_v2.access_network.id
}

# Private networks
locals {
  spawn_private_nets = {
    for name, info in var.private_networks :
    name => info.cidr if info.existing_subnet == ""
  }

  reuse_private_subnets = {
    for name, info in var.private_networks :
    name => info.existing_subnet if info.existing_subnet != ""
  }
}

resource "openstack_networking_network_v2" "private_networks" {
  for_each = local.heat.enabled ? {} : local.spawn_private_nets

  name                  = "${local.prefix}-${replace(each.key, "_", "-")}"
  port_security_enabled = false
}

resource "openstack_networking_subnet_v2" "private_subnets" {
  for_each = local.heat.enabled ? {} : local.spawn_private_nets

  name        = "${local.prefix}-${replace(each.key, "_", "-")}-subnet"
  network_id  = openstack_networking_network_v2.private_networks[each.key].id
  cidr        = each.value
  enable_dhcp = true
  ip_version  = 4
  no_gateway  = true
}

data "openstack_networking_subnet_v2" "private_subnets" {
  for_each = local.reuse_private_subnets

  name = each.value
}

locals {
  private_subnets = merge(
    openstack_networking_subnet_v2.private_subnets, data.openstack_networking_subnet_v2.private_subnets,
  )
}
