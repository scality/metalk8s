variable "prefix" {
  type        = string
  default     = ""
  description = "Prefix to use when naming deployed resources"
}

# OpenStack configuration
variable "openstack_flavours" {
  type = object({
    small = string, medium = string, large = string, xlarge = string,
  })
  description = "Map of VM flavours, indexed by T-shirt sizes"
}

variable "openstack_images" {
  type = object({
    centos7 = object({ image = string, user = string }),
    rhel7   = object({ image = string, user = string }),
  })
  description = <<-EOT
  Map of available VM image names, indexed by supported OS basename
  EOT
}

variable "openstack_link_local_ip" {
  type        = string
  description = "IP address for the metadata service used by cloud-init"
  # https://docs.openstack.org/nova/latest/user/metadata-service.html
}

# RHEL configuration
variable "rhsm_username" {
  type        = string
  description = "Username for accessing RedHat Subscription Manager"
  default     = ""
}

variable "rhsm_password" {
  type        = string
  description = "Password for accessing RedHat Subscription Manager"
  default     = ""
}

# Networks configuration
variable "public_network" {
  type        = string
  description = "The public network name to use for SSH access"
}

variable "control_plane" {
  type = object({
    private         = bool,
    existing_subnet = string,
    cidr            = string,
  })
  description = "Configuration of the control plane network"
  default     = { private = false, existing_subnet = "", cidr = "" }
}

variable "workload_plane" {
  type = object({
    private             = bool,
    reuse_control_plane = bool,
    existing_subnet     = string,
    cidr                = string,
  })
  description = "Configuration of the workload plane network"
  default = {
    private             = false,
    reuse_control_plane = false,
    existing_subnet     = "",
    cidr                = ""
  }
}

# MetalK8s deployment configuration
variable "offline" {
  type = bool
  description = <<-EOT
  Whether to isolate MetalK8s from the Internet (Bastion can be used as a
  forward proxy if required).
  EOT
  default = true
}

variable "bastion" {
  type        = object({
    enabled = bool,
    existing = string,
    flavour = string,
    image = string,
  })
  description = "Description of the Bastion VM to spawn"
}

variable "bootstrap" {
  type        = object({ flavour = string, image = string })
  description = "Description of the Bootstrap VM to spawn"
}

variable "nodes" {
  type        = object({ flavour = string, image = string, count = number })
  description = "Description of the extra Node VMs to spawn"
}

# Bastion configuration
variable "bastion_proxy_port" {
  type        = number
  description = "Port to use for the Bastion HTTP forward proxy (squid)"
  default     = 3128
}

# MetalK8s ISO
variable "metalk8s_iso" {
  type = object({
    mode = string, source = string, destination = string, mountpoint = string,
  })
  description = <<-EOT
  How to provision the MetalK8s ISO on Bootstrap:
    - `mode` can be 'local' or 'remote' ('local' relies on SCP, very slow)
    - `source` matches `mode`, can be a local path or public URL
    - `destination` defines where to store the ISO
    - `mountpoint` defines where to mount the ISO
  EOT
  default = {
    mode        = "local",
    source      = "", # Disables provisioning
    destination = "",
    mountpoint  = "",
  }
}

# Installation and post-installation flags
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
