variable "worker_uuid" {
  type    = string
  default = ""
}

resource "random_string" "current" {
  length  = 5
  special = false
}

locals {
  prefix = "metalk8s-${
    var.worker_uuid != "" ? var.worker_uuid : random_string.current.result
  }"
}
