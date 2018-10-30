# See ../common/README.md
#module "common" {
#  source = "../common"
#}

# Configure the openstack network
variable "openstack_network" {
  type = "map"

  default = {
    name = "tenantnetwork1"
  }
}

# Configure the base image to spawn each component. Only centos>7.4 supported
variable "openstack_image_name" {
  type    = "string"
  default = "CentOS-7-x86_64-GenericCloud-1805.qcow2"
}

# Configure default username to establish ssh connection
variable "ssh_user" {
  type    = "string"
  default = "centos"
}

resource "openstack_compute_keypair_v2" "local_ssh_key" {
  name       = "${var.ssh_key_name}"
  public_key = "${file(var.ssh_key_path)}"
  count      = "${var.ssh_key_deploy ? 1 : 0}"
}

data "openstack_compute_keypair_v2" "local_ssh_key" {
  name       = "${var.ssh_key_name}"
  depends_on = ["openstack_compute_keypair_v2.local_ssh_key"]
}

data "openstack_images_image_v2" "centos7" {
  name = "${var.openstack_image_name}"
}

data "openstack_compute_flavor_v2" "large" {
  # m1.xlarge
  vcpus = 8
  ram   = 16384
  disk  = 40
}

data "openstack_compute_flavor_v2" "medium" {
  vcpus = 4
  ram   = 8192
  disk  = 40
}
