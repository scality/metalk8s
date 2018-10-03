# Select the local tempdir (by default /tmp), for generating inventory_file
# Could be useful on Windows.
variable "temp_basedir" {
  type    = "string"
  default = "/tmp"
}

# By default, an inventory is locally generated
# (under /tmp/terraform-<random_string>/hosts.ini)
# You can disable this by setting this variable to false.
# Note: terraform output will still have an "inventory_file" set
# even if you set this variable to false.
variable "inventory_deploy" {
  default = true
}

# Select the size in GB of additional storage attached to nodes.
variable "volume_size" {
  type    = "string"
  default = 200
}

# Select the path where to find the public part of the ssh-keypair.
variable "ssh_key_path" {
  type    = "string"
  default = "~/.ssh/id_rsa.pub"
}

# Name of the openstack keypair used to deploy and access VM
variable "ssh_key_name" {
  type    = "string"
  default = "metalk8s"
}

# Control whether or not, deploying the ssh public key.
# Note: deployment will still look for an ssh key named as ${var.ssh_key_name}
# for deploying VM (should be just preprovisionned)
variable "ssh_key_deploy" {
  default = true
}

# All resources (except ssh_key that have it's own variable) will have a name
# prefix by the content of this variable
variable "name_prefix" {
  default = "metalk8s"
}

# Choose the number of nodes you want
variable "nodes_count" {
  type    = "string"
  default = 5
}

# Choose the number of etcd you want
variable "etcd_count" {
  type    = "string"
  default = 5
}

# Choose the number of master you want
variable "masters_count" {
  type    = "string"
  default = 3
}

# Choose the number of proxy you want
variable "proxies_count" {
  type    = "string"
  default = 0
}

# If false, etcd are colocated on nodes
# If true, gets is own VM
variable "etcd_dedicated" {
  default = true
}

# If false, master are colocated on nodes
# If true, gets is own VM
variable "masters_dedicated" {
  default = false
}

# Select if egress should be block or not
# By default this is disable if proxy_count = 0
# and enable if proxy_count > 0.
# You can override the default behaviour by setting the variable
variable "egress_blocked" {
  default = ""
}

# URL of proxy to proxyfied external http request
# By default this is disable if proxy_count = 0
# and set to the first proxy IP if proxy_count > 0.
# You can override the default behaviour by setting the variable
variable "proxy_url" {
  default = ""
}

resource "random_string" "inventory_dir" {
  length  = 10
  special = false
}

locals {
  inventory_file = "${var.temp_basedir}/terraform-${random_string.inventory_dir.result}/hosts.ini"
}

output "inventory_file" {
  value = "${local.inventory_file}"
}

output "ssh_key_path" {
  value = "${var.ssh_key_path}"
}

output "volume_size" {
  value = "${var.volume_size}"
}

locals {
  nodes_server_count = "${var.nodes_count}"

  # Number of etcd server to spawn (considering if got it's
  # dedicated group or not).
  # If more etcd than node, spawn the extras servers
  etcd_server_count = "${var.etcd_dedicated ?
        var.etcd_count :
        max(0, var.etcd_count - var.nodes_count)}"

  has_dedicated_etcd = "${local.etcd_server_count >= 1 ? 1 : 0}"
  etcd_on_nodes      = "${var.etcd_dedicated ?
        0 : min(var.etcd_count, local.nodes_server_count)}"

  # Number of masters server to spawn. Same notice as etcd
  masters_server_count = "${var.masters_dedicated ?
        var.masters_count :
        max(0, var.masters_count - var.etcd_count)}"

  has_dedicated_masters = "${local.masters_server_count >= 1 ? 1 : 0}"
  masters_on_etcd       = "${var.masters_dedicated ?
        0 : min(var.masters_count, var.etcd_count)}"

  egress_blocked = "${coalesce(var.egress_blocked, var.proxies_count > 0 ? 1 : 0)}"
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

output "proxies_server_count" {
  value = "${var.proxies_count}"
}

output "egress_blocked" {
  value = "${local.egress_blocked}"
}
