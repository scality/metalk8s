# Use in CI to link a deployment to its worker
variable "worker_uuid" {
  type    = string
  default = ""
}

# SSH local configuration
variable "ssh_key_pair" {
  type = object({
    private_key = string,
    public_key  = string,
  })
  description = "The SSH key pair to use for setting up OpenStack VMs"
  default = {
    private_key = "~/.ssh/terraform",
    public_key  = "~/.ssh/terraform.pub"
  }
}

# Metadata service used by cloud-init
# https://docs.openstack.org/nova/latest/user/metadata-service.html
variable "openstack_link_local_ip" {
  type    = string
  default = "169.254.169.254"
}

# Networks configuration
variable "default_network" {
  type        = string
  description = "The default network name to use for SSH access"
  default     = "tenantnetwork1"
}
