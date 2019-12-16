variable "name" {
  type        = "string"
  description = "The name of the cluster to spawn"
}

variable "default_network" {
  type        = string
  description = "The default network name to use for SSH access"
}

variable "key_pair" {
  type = object({
    private_key = string,
    public_key  = string,
  })
  description = "The SSH key pair to use for setting up OpenStack VMs"
}

variable "nodes_count" {
  type        = number
  description = "Number of nodes to spawn in addition to Bootstrap and Bastion"
  default     = 1
}

variable "private_networks" {
  type = list(object({
    secgroup     = object({ name = string }),
    node_ports   = list(object({ id = any })),
    bastion_port = any,
  }))
  description = "Any private network to attach the cluster nodes to"
  default     = []
}

variable "bastion_enabled" {
  type        = bool
  description = "Whether to spawn a Bastion VM with online access"
  default     = true
}

# OpenStack VMs configuration
variable "image_name" {
  type    = string
  default = "CentOS-7-x86_64-GenericCloud-1809.qcow2"
}

variable "flavour_name" {
  type    = string
  default = "m1.medium"
}

# Metadata service used by cloud-init
# https://docs.openstack.org/nova/latest/user/metadata-service.html
variable "openstack_link_local_ip" {
  type    = string
  default = "169.254.169.254"
}
