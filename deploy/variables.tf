# Use in CI to link a deployment to its worker
variable "worker_uuid" {
  type    = string
  default = ""
}

# OpenStack VMs configuration
variable "openstack_image_name" {
  type    = string
  default = "CentOS-7-x86_64-GenericCloud-1809.qcow2"
}

variable "openstack_flavour_name" {
  type    = string
  default = "m1.medium"
}

# MetalK8s deployment configuration
variable "nodes_count" {
  type        = string
  description = "Number of nodes to spawn in addition to Bootstrap and Bastion"
  default     = "1"
}

variable "metalk8s_iso" {
  type = object({
    mode = string
    path = string
  })
  description = "Metalk8s ISO to upload to Bootstrap (can be local or remote)"
  default     = { mode = "local", path = "" }
}

variable "metalk8s_iso_dest" {
  type        = string
  description = "Destination path to the Metalk8s ISO on the Bootstrap"
  default     = "/home/centos/metalk8s.iso"
}

variable "metalk8s_iso_mountpoint" {
  type        = string
  description = "Mountpoint for the Metalk8s ISO"
  default     = "/var/tmp/metalk8s"
}

variable "metalk8s_bootstrap" {
  type        = bool
  description = "Whether to install the Bootstrap node"
  default     = false
}

variable "metalk8s_provision_volumes" {
  type        = bool
  description = "Whether to provision Volumes for Prometheus and AlertManager"
  default     = false
}
