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
