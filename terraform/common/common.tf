variable "temp_basedir" {
  type    = "string"
  default = "/tmp"
}

variable "inventory_deploy" {
  type    = "string"
  default = "true"
}

resource "random_string" "inventory_dir" {
  length = 10
  special = "false"
}

locals {
  inventory_file = "${var.temp_basedir}/terraform-${random_string.inventory_dir.result}/hosts.ini"
}

output "inventory_file" {
  value = "${local.inventory_file}"
}

variable "ssh_key_path" {
  type    = "string"
  default = "~/.ssh/id_rsa.pub"
}

variable "ssh_key_name" {
  type    = "string"
  default = "metalk8s"
}

variable "ssh_key_deploy" {
  type    = "string"
  default = "true"
}

output "ssh_key_path" {
  value = "${var.ssh_key_path}"
}

variable "volume_size" {
  type    = "string"
  default = 200
}

output "volume_size" {
  value = "${var.volume_size}"
}

variable "nodes_count" {
  type    = "string"
  default = 5
}

variable "etcd_count" {
  type    = "string"
  default = 5
}

variable "etcd_dedicated" {
  type    = "string"
  default = "true"
}

variable "masters_count" {
  type    = "string"
  default = 3
}

variable "masters_dedicated" {
  type    = "string"
  default = "false"
}

locals {
  nodes_server_count   = "${var.nodes_count}"
  etcd_server_count    = "${var.etcd_dedicated == "true" ?
        var.etcd_count :
        max(0, var.etcd_count - var.nodes_count)}"
  masters_server_count = "${var.masters_dedicated == "true" ?
        var.masters_count :
        max(0, var.masters_count - var.etcd_count)}"
}

output "nodes_server_count" {
  value = "${local.nodes_server_count}"
}

output "etcd_server_count" {
  value = "${local.etcd_server_count}"
}

output "masters_server_count" {
  value = "${local.masters_server_count}"
}
