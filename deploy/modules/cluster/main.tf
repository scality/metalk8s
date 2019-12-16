# Define a server group for the cluster
resource "openstack_compute_servergroup_v2" "servergroup" {
  name     = "${var.name}-servergroup"
  policies = []
}

# Create a keypair for provisioning nodes
resource "openstack_compute_keypair_v2" "local_ssh_key" {
  name       = var.name
  public_key = file(var.key_pair.public_key)
}

# Get default network info
data "openstack_networking_network_v2" "default_network" {
  name = var.default_network
}

data "openstack_networking_subnet_v2" "default_subnet" {
  network_id = data.openstack_networking_network_v2.default_network.id
}

locals {
  dns_servers = tolist(
    data.openstack_networking_subnet_v2.default_subnet.dns_nameservers
  )
}

# Create a security group for the default network
resource "openstack_networking_secgroup_v2" "nodes" {
  name                 = "${var.name}-nodes"
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

# Deploy a Bootstrap node
module "bootstrap" {
  source = "../machine"

  name        = "${var.name}-bootstrap"
  servergroup = openstack_compute_servergroup_v2.servergroup.id

  image_name   = var.image_name
  flavour_name = var.flavour_name
  key_pair = {
    name        = openstack_compute_keypair_v2.local_ssh_key.name,
    private_key = var.key_pair.private_key,
  }

  default_network = data.openstack_networking_network_v2.default_network.name
  security_groups = concat(
    [openstack_networking_secgroup_v2.nodes.name],
    var.private_networks[*].secgroup.name,
  )
  extra_ports = [for network in var.private_networks : [network.node_ports[0]]]

  generate_key = {
    enabled = true,
    path    = "/home/centos/.ssh/bootstrap",
  }
}

# Deploy all other nodes
module "nodes" {
  source = "../machine"

  name        = "${var.name}-node"
  servergroup = openstack_compute_servergroup_v2.servergroup.id
  replicas    = var.nodes_count

  image_name   = var.image_name
  flavour_name = var.flavour_name
  key_pair = {
    name        = openstack_compute_keypair_v2.local_ssh_key.name,
    private_key = var.key_pair.private_key,
  }

  default_network = data.openstack_networking_network_v2.default_network.name
  security_groups = concat(
    [openstack_networking_secgroup_v2.nodes.name],
    var.private_networks[*].secgroup.name,
  )
  extra_ports = [
    for network in var.private_networks :
    slice(network.node_ports, 1, var.nodes_count + 1)
  ]
}

# Deploy a Bastion node if required

# Keep the default rules for the Bastion so it remains online
resource "openstack_networking_secgroup_v2" "bastion_secgroup" {
  count = var.bastion_enabled ? 1 : 0

  name        = "${var.name}-bastion"
  description = "Security group for the Bastion VM"
}

module "bastion" {
  source = "../machine"

  name        = "${var.name}-bastion"
  servergroup = openstack_compute_servergroup_v2.servergroup.id
  replicas    = var.bastion_enabled ? 1 : 0

  image_name   = var.image_name
  flavour_name = var.flavour_name
  key_pair = {
    name        = openstack_compute_keypair_v2.local_ssh_key.name,
    private_key = var.key_pair.private_key,
  }

  default_network = data.openstack_networking_network_v2.default_network.name
  security_groups = concat(
    [
      openstack_networking_secgroup_v2.nodes.name,
      openstack_networking_secgroup_v2.bastion_secgroup[0].name,
    ],
    var.private_networks[*].secgroup.name,
  )
  extra_ports = var.private_networks[*].bastion_port

  generate_key = {
    enabled = true,
    path    = "/home/centos/.ssh/bastion",
  }
}

resource "null_resource" "setup-bastion" {
  count = var.bastion_enabled ? 1 : 0

  depends_on = [
    module.bastion
  ]

  connection {
    host        = module.bastion.machines[0].access_ip
    type        = "ssh"
    user        = "centos"
    private_key = file(var.key_pair.private_key)
  }

  # Install basic dependencies for running end-to-end tests
  provisioner "remote-exec" {
    inline = [
      "chmod 600 .ssh/bastion",
      "sudo yum install -y epel-release",
      "sudo yum install -y python36-pip",
      "sudo pip3.6 install tox",
    ]
  }
}

# Share public keys (TODO)

# Provision bootstrap (TODO)
