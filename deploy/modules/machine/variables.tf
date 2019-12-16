variable "name" {
  type        = string
  description = "The machine's name"
}

variable "replicas" {
  type        = number
  description = "Number of replicas of this machine to create"
  default     = 1
}

variable "servergroup" {
  type        = string
  description = "The server group in which to spawn the machine"
  default     = ""
}

variable "key_pair" {
  type = object({
    name        = string,
    private_key = string,
  })
  description = "The SSH key pair to use"
}

variable "default_network" {
  type        = string
  description = "The default network name to use for SSH access"
}

variable "security_groups" {
  type        = list(string)
  description = "The security group names to use for this machine"
}

variable "extra_ports" {
  type        = list(list(object({ id = any })))
  description = "Extra network ports to attach to the machine"
  default     = []
}

variable "generate_key" {
  type = object({
    enabled = bool,
    path    = string,
  })
  description = "Whether to generate an SSH key pair"
  default = {
    enabled = false,
    path    = "/home/centos/.ssh/terraform_generated",
  }
}

# OpenStack VM configuration
variable "image_name" {
  type    = string
  default = "CentOS-7-x86_64-GenericCloud-1809.qcow2"
}

variable "flavour_name" {
  type    = string
  default = "m1.medium"
}
