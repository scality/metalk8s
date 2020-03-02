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
  type = object({
    generate         = bool,
    public_key_path  = string,
    public_key       = string,
    private_key_path = string,
    private_key      = string,
  })
  default = {
    generate         = true,
    public_key_path  = "",
    public_key       = "",
    private_key_path = "",
    private_key      = "",
  }
  description = "SSH keypair to use for provisioning VMs with Terraform"

  validation {
    condition = var.access_keypair.generate ? true : (
      var.access_keypair.public_key_path != ""
      ? can(file(var.access_keypair.public_key_path))
      : var.access_keypair.public_key != ""
    )
    error_message = "Public key must be provided (either inline or with a local path), or `var.access_keypair.generate` must be `true`."
  }

  validation {
    condition = var.access_keypair.generate ? true : (
      var.access_keypair.private_key_path != ""
      ? can(file(var.access_keypair.private_key_path))
      : var.access_keypair.private_key != ""
    )
    error_message = "Private key must be provided (either inline or with a local path), or `var.access_keypair.generate` must be `true`."
  }
}

# OpenStack configuration
variable "openstack_flavors" {
  type        = map(string)
  description = "Map of available VM flavors"
}

variable "openstack_images" {
  type        = map(object({ image = string, user = string }))
  description = "Map of available VM image names"
}

# RHEL configuration
variable "rhel_subscription" {
  type    = object({ username = string, password = string })
  default = { username = "", password = "" }

  # NOTE: disabled since we can't reference other variables in validation rules
  # validation {
  #   condition = (
  #     can(regex(
  #       "(?i:rhel)",
  #       join(",", concat(
  #         [var.openstack_images[var.bastion.image].image],
  #         [
  #           for group in values(var.machine_groups):
  #           var.openstack_images[group.image].image
  #         ]
  #       ))
  #     ))
  #     ? (
  #       var.rhel_subscription.username != ""
  #       && var.rhel_subscription.password != ""
  #     )
  #     : true  # Ignore if RHEL is not used
  #   )
  #   error_message = "Both username and password must be filled if RHEL is used."
  # }
}

# Networks configuration
variable "access_network" {
  type    = object({ name = string, id = string, online = bool })
  default = { name = "", id = "", online = true }
}

variable "private_networks" {
  type    = map(object({ existing_subnet = string, cidr = string }))
  default = {}
}

# Infra configuration
variable "machine_groups" {
  type = map(object({
    count    = number,
    flavor   = string,
    image    = string,
    networks = list(string),
  }))
  default = {
    bootstrap = {
      count    = 1,
      flavor   = "large",
      image    = "centos7",
      networks = [],
    },
  }
}

# Bastion configuration
variable "bastion" {
  type = object({
    enabled = bool,
    flavor  = string,
    image   = string,
  })
  description = "Description of the Bastion VM to spawn"
  default = {
    enabled = true,
    flavor  = "medium",
    image   = "centos7",
  }
}

variable "bastion_proxy_port" {
  type        = number
  description = "Port to use for the Bastion HTTP forward proxy (squid)"
  default     = 3128
}

# Opt-in alternative Heat deployment
variable "heat" {
  type = object({
    enabled          = bool,
    stack_name       = string,
    parameters       = object({}),
    parameters_path  = string,
    template_path    = string,
    environment_path = string,
  })

  default = {
    enabled          = false,
    stack_name       = "", # if empty, default to ${local.prefix}
    parameters       = {},
    parameters_path  = "",
    template_path    = "", # if empty, default to ../heat/template.yaml
    environment_path = "",
  }

  description = <<-EOF
  Definition of a Heat Stack to create or import.
  Using this will entirely disable spawning all resources defined in this
  module, and only focus on installation and configuration of MetalK8s on
  the existing infrastructure.
  EOF

  validation {
    condition = (
      var.heat.enabled && var.heat.parameters_path != ""
      ? can(file(var.heat.parameters_path))
      : true
    )
    error_message = "Cannot read parameters file (`var.heat.parameters_path`)."
  }

  validation {
    condition = (
      var.heat.enabled && var.heat.template_path != ""
      ? can(file(var.heat.template_path))
      : true
    )
    error_message = "Cannot read template file (`var.heat.template_path`)."
  }

  validation {
    condition = (
      var.heat.enabled && var.heat.environment_path != ""
      ? can(file(var.heat.environment_path))
      : true
    )
    error_message = "Cannot read environment file (`var.heat.environment_path`)."
  }
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

variable "metalk8s_clusters" {
  type = map(object({
    bootstrap = object({
      group = string,
      # Optional: roles = list(string), ["bootstrap", "master", "etcd", "infra"] by default
      # Optional: taints = list(string), ["bootstrap", "infra"] by default
    }),
    node_groups = map(object({
      group  = string,
      roles  = list(string),
      taints = list(string),
    })),
    networks = object({
      control_plane  = string,
      workload_plane = string,
    }),
    volumes = list(object({ node = string, template = string })),
  }))
  default = {
    default = {
      bootstrap   = { group = "bootstrap" },
      node_groups = {},
      networks = {
        control_plane  = "__access__",
        workload_plane = "__access__",
      },
      volumes = [],
    }
  }
}
