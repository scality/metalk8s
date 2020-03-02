# Versions
terraform {
  required_version = ">= 0.12.21"

  experiments = [variable_validation]

  required_providers {
    null      = "~> 2.1.2"
    openstack = "~> 1.25.0"
    random    = "~> 2.1.2"
    template  = "~> 2.1.2"
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
