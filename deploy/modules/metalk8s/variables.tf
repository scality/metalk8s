variable "cluster" {
  type        = any
  description = "Cluster to provision MetalK8s on"
}

variable "private_key" {
  type        = string
  description = "Private key to use for SSH access to the cluster"
}

variable "control_plane_network" {
  type        = object({ iface = string, vip = string })
  description = "Control-plane network information"
}

variable "workload_plane_network" {
  type        = object({ iface = string })
  description = "Workload-plane network information"
}

variable "iso" {
  type = object({
    mode = string
    path = string
  })
  description = "Metalk8s ISO to upload to Bootstrap (can be local or remote)"
  default     = { mode = "local", path = "" }
}

variable "iso_dest" {
  type        = string
  description = "Location where the Metalk8s ISO will be copied on the bootstrap node"
  default     = "/home/centos/metalk8s.iso"
}

variable "iso_mountpoint" {
  type        = string
  description = "Mountpoint for the Metalk8s ISO"
  default     = "/var/tmp/metalk8s"
}

variable "bootstrap" {
  type        = bool
  description = "Whether to install the Bootstrap node"
  default     = false
}

variable "provision_volumes" {
  type        = bool
  description = "Whether to provision Volumes for Prometheus and AlertManager"
  default     = false
}
