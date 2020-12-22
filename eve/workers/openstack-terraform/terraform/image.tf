variable "os" {
  type    = string
  default = "centos-7"
}

variable "openstack_images_name" {
  type    = map
  default = {
    "centos-7"  = "CentOS-7-x86_64-GenericCloud-latest",
    "rhel-7"    = "rhel-server-updated-7.6-x86_64-kvm.qcow2"
    "rhel-8"    = "rhel-8.2-x86_64-kvm"
  }
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
  # Always use centos-7 image for bastion
  bastion_image = var.openstack_images_name["centos-7"]

  default_image = var.openstack_images_name[var.os]
  bootstrap_image = var.restore_env != "" ? "metalk8s-${var.restore_env}-bootstrap" : local.default_image
  nodes_image = [
    for i in range(var.nodes_count) :
    var.restore_env != "" ? "metalk8s-${var.restore_env}-node-${i + 1}" : local.default_image
  ]
}
