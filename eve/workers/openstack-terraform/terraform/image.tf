variable "openstack_image_name" {
  type    = string
  default = "CentOS-7-x86_64-GenericCloud-1809.qcow2"
}

variable "restore_env" {
  type    = string
  default = ""
}

variable "openstack_flavour_name" {
  type    = string
  default = "m1.medium"
}

locals {
  bootstrap_image = var.restore_env != "" ? "metalk8s-${var.restore_env}-bootstrap" : var.openstack_image_name
  nodes_image = [
    for i in range(var.nodes_count) :
    var.restore_env != "" ? "metalk8s-${var.restore_env}-node-${i + 1}" : var.openstack_image_name
  ]
}
