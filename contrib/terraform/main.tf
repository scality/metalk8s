# Versions
terraform {
  required_version = ">= 0.12.7"

  required_providers {
    null      = "~> 2.1.2"
    openstack = "~> 1.20.0"
    random    = "~> 2.1.2"
  }
}


# Deployment prefix (use a generated one if nothing provided)
resource "random_string" "current" {
  length  = 5
  special = false
}

locals {
  prefix = (
    var.prefix != "" ? var.prefix : "metalk8s-${random_string.current.result}"
  )
}


# RHEL specifics
locals {
  using_rhel = {
    bastion   = var.bastion.image == "redhat7",
    bootstrap = var.bootstrap.image == "redhat7",
    nodes     = var.nodes.image == "redhat7",
  }
}


# Scripts hashes (to trigger re-upload when necessary)
locals {
  script_hashes = {
    create_volumes    = filemd5("${path.root}/scripts/create-volumes.sh"),
    enable_ipip       = filemd5("${path.root}/scripts/enable_ipip.sh"),
    iface_config      = filemd5("${path.root}/scripts/network-iface-config.sh"),
    prepare_bootstrap = filemd5("${path.root}/scripts/prepare-bootstrap.py"),
    rhsm_register     = filemd5("${path.root}/scripts/rhsm-register.sh"),
    set_yum_proxy     = filemd5("${path.root}/scripts/set_yum_proxy.py"),
  }
}
