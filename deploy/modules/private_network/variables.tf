# Required arguments
variable "name" {
  type        = string
  description = "Unique name for this private network"
}

variable "allocation_pool_start" {
  type        = string
  description = "First IP for the allocation pool"
}

variable "allocation_pool_end" {
  type        = string
  description = "Last IP for the allocation pool"
}

variable "cidr" {
  type        = string
  description = "CIDR representation of the network"
}

variable "gateway" {
  type        = string
  description = "Gateway IP address"
}

# Optional arguments
variable "ports_count" {
  type        = number
  description = "Number of ports to create"
  default     = 1
}

variable "bastion_enabled" {
  type        = bool
  description = "Whether to create a port for a Bastion"
  default     = true
}

variable "vip" {
  type        = string
  description = "Virtual IP to reserve for use by nodes in this network"
  default     = ""
}
