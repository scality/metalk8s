# Default network
data "openstack_networking_network_v2" "default_network" {
  name = var.default_network
}

data "openstack_networking_subnet_v2" "default_subnet" {
  network_id = data.openstack_networking_network_v2.default_network.id
}

# Control-plane
locals {
  control_plane_network = {
    # Computed values
    enabled = contains(var.private_networks, "control_plane")
    name    = "${local.prefix}-control-plane",
    # Hard-coded defaults
    iface = "eth1",
    cidr  = "192.168.1.0/24",
    # Customizable values
    subnet_name = var.control_plane_subnet,
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

locals {
  # The VIP can be configured as:
  # - a static IP
  # - the number of the IP to pick from the configured subnet range
  # - the special character "_", to pick any IP
  # - empty, to not use a VIP
  # Only enabled if the control-plane network is enabled
  control_plane_vip = local.control_plane_network.enabled ? (
    length(regexall("^[1-9][0-9]*$", var.control_plane_vip)) > 0
    ? cidrhost(
      local.control_plane_subnet[0].cidr,
      tonumber(var.control_plane_vip)
    ) : var.control_plane_vip
  ) : ""
}

resource "openstack_networking_port_v2" "control_plane_vip" {
  name       = "${local.control_plane_network.name}-vip"
  network_id = local.control_plane_subnet[0].network_id

  fixed_ip {
    subnet_id  = local.control_plane_subnet[0].id
    ip_address = local.control_plane_vip == "_" ? "" : local.control_plane_vip
  }

  count = (
    local.control_plane_network.enabled
    && local.control_plane_vip != ""
  ) ? 1 : 0
}

# Workload-plane
locals {
  workload_plane_network = {
    # Computed values
    enabled = contains(var.private_networks, "workload_plane")
    name    = "${local.prefix}-workload-plane",
    # Hard-coded defaults
    iface = "eth2",
    cidr  = "192.168.2.0/24",
    # Customizable values
    subnet_name = var.workload_plane_subnet,
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
  # The VIP can be configured as:
  # - a static IP
  # - the number of the IP to pick from the configured subnet range
  # - the special character "_", to pick any IP
  # - empty, to not use a VIP
  # Only enabled if the workload-plane network is enabled
  workload_plane_vip = local.workload_plane_network.enabled ? (
    length(regexall("^[1-9][0-9]*$", var.workload_plane_vip)) > 0
    ? cidrhost(
      local.workload_plane_subnet[0].cidr,
      tonumber(var.workload_plane_vip)
    ) : var.workload_plane_vip
  ) : ""
}

resource "openstack_networking_port_v2" "workload_plane_vip" {
  name       = "${local.workload_plane_network.name}-vip"
  network_id = local.workload_plane_subnet[0].network_id

  fixed_ip {
    subnet_id  = local.workload_plane_subnet[0].id
    ip_address = local.workload_plane_vip == "_" ? "" : local.workload_plane_vip
  }

  count = local.workload_plane_vip != "" ? 1 : 0
}
