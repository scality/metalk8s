# General settings
variable "prefix" {
  type        = string
  default     = ""
  description = <<-EOF
  Prefix to use when naming deployed resources
  If set or left to an empty string, a generated prefix
  (`metalk8s-<5-random-chars>`) will be used.
  EOF
}

variable "access_keypair" {
  type        = object({
    generate = bool,
    public_key_path = string,
    public_key = string,
    private_key_path = string,
    private_key = string,
  })
  default = {
    generate = true,
    public_key_path = "",
    public_key = "",
    private_key_path = "",
    private_key = "",
  }
  description = "SSH keypair to use for provisioning VMs with Terraform"
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
    enabled         = bool,
    existing_subnet = string,
    cidr            = string,
  })
  description = <<-EOT
  Configuration of the control plane network
  If disabled, MetalK8s will use the public network for its control plane.
  EOT
  default     = { enabled = false, existing_subnet = "", cidr = "" }
}

variable "workload_plane" {
  type = object({
    enabled             = bool,
    reuse_control_plane = bool,
    existing_subnet     = string,
    cidr                = string,
  })
  description = <<-EOT
  Configuration of the workload plane network
  If disabled, MetalK8s will use the public network for its workload plane.
  If `reuse_control_plane` is true, no additional port will be created for
  the workload plane subnet, and MetalK8s will use the same CIDR for both
  network configurations.
  EOT
  default = {
    enabled             = false,
    reuse_control_plane = false,
    existing_subnet     = "",
    cidr                = ""
  }
}

# MetalK8s deployment configuration
variable "online" {
  type = bool
  description = <<-EOT
  Whether to leave Internet access to the cluster or not (Bastion can be used
  as a forward proxy if required).
  EOT
  default = false
}

variable "bastion" {
  type        = object({
    enabled = bool,
    flavour = string,
    image = string,
  })
  description = "Description of the Bastion VM to spawn"
  default = {
    enabled = true,
    flavour = "medium",
    image = "centos7",
  }
}

variable "bootstrap" {
  type        = object({ flavour = string, image = string })
  description = "Description of the Bootstrap VM to spawn"
  default = {
    flavour = "large",
    image = "centos7",
  }
}

variable "nodes" {
  type        = object({ flavour = string, image = string, count = number })
  description = "Description of the extra Node VMs to spawn"
  default = {
    count = 2,
    flavour = "large",
    image = "centos7",
  }
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

# Opt-in alternative Heat deployment
variable "heat" {
  type        = object({
    enabled = bool,
    stack_name = string,
    parameters = object({}),
    parameters_path = string,
    template_path = string,
    environment_path = string,
  })

  default     = {
    enabled = false,
    stack_name = "", # if empty, default to ${local.prefix}
    parameters = {},
    parameters_path = "",
    template_path = "", # if empty, default to ../heat/template.yaml
    environment_path = "",
  }

  description = <<-EOF
  Definition of a Heat Stack to create or import.
  Using this will entirely disable spawning all resources defined in this
  module, and only focus on installation and configuration of MetalK8s on
  the existing infrastructure.
  EOF
}
