# Versions
terraform {
  required_version = ">= 0.12.7"

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

# Openstack base image to use for worker machines (bootstrap and nodes)
locals {
  os_image = var.openstack_images[var.openstack_use_os]
}

# Keypair for provisioning nodes
resource "openstack_compute_keypair_v2" "local_ssh_key" {
  name       = local.prefix
  public_key = file(var.ssh_key_pair.public_key)
}
