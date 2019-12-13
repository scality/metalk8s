variable "openstack_image_name" {
  type    = string
  default = "CentOS-7-x86_64-GenericCloud-1809.qcow2"
}

variable "openstack_flavour_name" {
  type    = map
  default = {
    bastion   = "m1.medium"
    bootstrap = "m1.large"
    nodes     = "m1.medium"
  }
}
