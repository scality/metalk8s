# Versions
terraform {
  required_version = ">= 0.12"

  required_providers {
    null      = "~> 2.1.2"
    openstack = "~> 1.20.0"
    random    = "~> 2.1.2"
  }
}


# Deployment prefix
resource "random_string" "current" {
  length  = 5
  special = false
}

locals {
  prefix = "metalk8s-${
    var.worker_uuid != "" ? var.worker_uuid : random_string.current.result
  }"
}


# Setup private networks
module "control_plane_network" {
  source = "./modules/private_network"

  name                  = "${local.prefix}-control-plane"
  cidr                  = "192.168.1.0/28"
  gateway               = "192.168.1.1"
  vip                   = "192.168.1.2"
  allocation_pool_start = "192.168.1.3"
  allocation_pool_end   = "192.168.1.14"
  ports_count           = var.nodes_count + 1
  bastion_enabled       = true
}

module "workload_plane_network" {
  source = "./modules/private_network"

  name                  = "${local.prefix}-workload-plane"
  cidr                  = "192.168.2.0/28"
  gateway               = "192.168.2.1"
  vip                   = "192.168.2.2"
  allocation_pool_start = "192.168.2.3"
  allocation_pool_end   = "192.168.2.14"
  ports_count           = var.nodes_count + 1
  bastion_enabled       = true
}


# Spawn the cluster
module "cluster" {
  source = "./modules/cluster"

  name = local.prefix

  default_network = "tenantnetwork1" # TODO: var.default_network
  key_pair = {
    private_key = "~/.ssh/terraform",
    public_key  = "~/.ssh/terraform.pub",
  }

  nodes_count     = var.nodes_count
  bastion_enabled = true # TODO: var.bastion_enabled

  private_networks = [
    module.control_plane_network,
    module.workload_plane_network
  ]
}


# Setup SSH for the cluster (local and Bastion SSH config file, sharing public
# keys from Bastion and Bootstrap)
# TODO: share public keys in "cluster", only setup SSH config files in "ssh"
module "setup-ssh" {
  source = "./modules/ssh"

  cluster     = module.cluster
  private_key = "~/.ssh/terraform"
}

# Provision MetalK8s on the spawned cluster
module "setup-metalk8s" {
  source = "./modules/metalk8s"

  cluster     = module.cluster
  private_key = "~/.ssh/terraform"

  control_plane_network = {
    iface = "eth1",
    vip   = module.control_plane_network.vip,
  }
  workload_plane_network = { iface = "eth2" }

  iso               = var.metalk8s_iso
  iso_dest          = var.metalk8s_iso_dest
  iso_mountpoint    = var.metalk8s_iso_mountpoint
  bootstrap         = var.metalk8s_bootstrap
  provision_volumes = var.metalk8s_provision_volumes
}
