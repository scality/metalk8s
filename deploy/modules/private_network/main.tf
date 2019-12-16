resource "openstack_networking_network_v2" "network" {
  name = var.name
}

resource "openstack_networking_subnet_v2" "subnet" {
  name        = var.name
  network_id  = openstack_networking_network_v2.network.id
  enable_dhcp = true
  cidr        = var.cidr
  ip_version  = 4
  gateway_ip  = var.gateway
  allocation_pool {
    start = var.allocation_pool_start
    end   = var.allocation_pool_end
  }
}

resource "openstack_networking_secgroup_v2" "secgroup" {
  name        = var.name
  description = "Security group for MetalK8s ${var.name} network"
}

resource "openstack_networking_secgroup_rule_v2" "ingress" {
  direction         = "ingress"
  ethertype         = "IPv4"
  remote_group_id   = openstack_networking_secgroup_v2.secgroup.id
  security_group_id = openstack_networking_secgroup_v2.secgroup.id
}

resource "openstack_networking_secgroup_rule_v2" "egress" {
  direction         = "egress"
  ethertype         = "IPv4"
  remote_group_id   = openstack_networking_secgroup_v2.secgroup.id
  security_group_id = openstack_networking_secgroup_v2.secgroup.id
}

resource "openstack_networking_port_v2" "vip" {
  name       = "${var.name}-vip"
  network_id = openstack_networking_network_v2.network.id

  security_group_ids = [
    openstack_networking_secgroup_v2.secgroup.id,
  ]

  fixed_ip {
    subnet_id  = openstack_networking_subnet_v2.subnet.id
    ip_address = var.vip
  }

  count = var.vip != "" ? 1 : 0
}

resource "openstack_networking_port_v2" "node_ports" {
  name           = "${var.name}-${count.index}"
  admin_state_up = "true"
  network_id     = openstack_networking_network_v2.network.id

  security_group_ids = [
    openstack_networking_secgroup_v2.secgroup.id,
  ]

  fixed_ip {
    subnet_id = openstack_networking_subnet_v2.subnet.id
  }

  dynamic "allowed_address_pairs" {
    for_each = var.vip == "" ? [] : list(var.vip)

    content {
      ip_address = allowed_address_pairs.value
    }
  }

  count = var.ports_count
}

resource "openstack_networking_port_v2" "bastion_port" {
  name           = "${var.name}-bastion"
  admin_state_up = "true"
  network_id     = openstack_networking_network_v2.network.id

  security_group_ids = [
    openstack_networking_secgroup_v2.secgroup.id,
  ]

  fixed_ip {
    subnet_id = openstack_networking_subnet_v2.subnet.id
  }

  count = var.bastion_enabled ? 1 : 0
}
