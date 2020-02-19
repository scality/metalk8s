# Public network
data "openstack_networking_network_v2" "public_network" {
  name = var.public_network
}

data "openstack_networking_subnet_v2" "public_subnet" {
  network_id = data.openstack_networking_network_v2.public_network.id
}

# Control-plane
locals {
  control_plane_network = {
    name        = "${local.prefix}-control-plane",
    enabled     = var.control_plane.private,
    cidr        = var.control_plane.cidr,
    subnet_name = var.control_plane.existing_subnet,
  }
}

resource "openstack_networking_network_v2" "control_plane" {
  count = (
    local.control_plane_network.enabled
    && local.control_plane_network.subnet_name == ""
  ) ? 1 : 0

  name                  = local.control_plane_network.name
  port_security_enabled = false
}

resource "openstack_networking_subnet_v2" "control_plane" {
  count = (
    local.control_plane_network.enabled
    && local.control_plane_network.subnet_name == ""
  ) ? 1 : 0

  name        = local.control_plane_network.name
  network_id  = openstack_networking_network_v2.control_plane[0].id
  enable_dhcp = true
  cidr        = local.control_plane_network.cidr
  ip_version  = 4
  no_gateway  = true
}

data "openstack_networking_subnet_v2" "control_plane" {
  count = (
    local.control_plane_network.enabled
    && local.control_plane_network.subnet_name != ""
  ) ? 1 : 0

  name = local.control_plane_network.subnet_name
}

locals {
  control_plane_subnet = (
    local.control_plane_network.subnet_name != ""
    ? data.openstack_networking_subnet_v2.control_plane
    : openstack_networking_subnet_v2.control_plane
  )
}

# Workload-plane
locals {
  workload_plane_network = {
    name        = "${local.prefix}-workload-plane",
    enabled     = var.workload_plane.private,
    cidr        = var.workload_plane.cidr,
    subnet_name = var.workload_plane.existing_subnet,
  }
}

resource "openstack_networking_network_v2" "workload_plane" {
  count = (
    local.workload_plane_network.enabled
    && local.workload_plane_network.subnet_name == ""
  ) ? 1 : 0

  name                  = local.workload_plane_network.name
  port_security_enabled = false
}

resource "openstack_networking_subnet_v2" "workload_plane" {
  count = (
    local.control_plane_network.enabled
    && local.control_plane_network.subnet_name == ""
  ) ? 1 : 0

  name        = local.workload_plane_network.name
  network_id  = openstack_networking_network_v2.workload_plane[0].id
  enable_dhcp = true
  cidr        = local.workload_plane_network.cidr
  ip_version  = 4
  no_gateway  = true
}

data "openstack_networking_subnet_v2" "workload_plane" {
  count = (
    local.workload_plane_network.enabled
    && local.workload_plane_network.subnet_name != ""
  ) ? 1 : 0

  name = local.workload_plane_network.subnet_name
}

locals {
  workload_plane_subnet = (
    local.workload_plane_network.subnet_name != ""
    ? data.openstack_networking_subnet_v2.workload_plane
    : openstack_networking_subnet_v2.workload_plane
  )
}

locals {
  # If either workload plane or control plane are configured to use the public
  # network, we assume PortSecurity is enabled, and activate IPIP encapsulation
  enable_ipip = ! (var.control_plane.private && var.workload_plane.private)
}
