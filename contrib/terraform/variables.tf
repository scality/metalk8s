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

# OpenStack configuration
variable "openstack_image_name" {
  type    = string
  default = "CentOS-7-x86_64-GenericCloud-1809.qcow2"
}

variable "openstack_flavours" {
  type = object({ bootstrap = string, nodes = string, bastion = string })
  default = {
    bastion   = "m1.medium",
    bootstrap = "m1.large",
    nodes     = "m1.large",
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

variable "private_networks" {
  type        = list(string)
  description = "Which private networks to use (or spawn)"
  default     = []
}

variable "control_plane_subnet" {
  type        = string
  description = "Existing subnet to use for the control-plane"
  default     = ""
}

variable "control_plane_vip" {
  type        = string
  description = "VIP to create for the control-plane"
  default     = "192.168.1.2"
}

variable "workload_plane_subnet" {
  type        = string
  description = "Existing subnet to use for the workload-plane"
  default     = ""
}

variable "workload_plane_vip" {
  type        = string
  description = "VIP to create for the workload-plane"
  default     = ""
}

# MetalK8s deployment configuration
variable "nodes_count" {
  type        = string
  description = "Number of nodes to spawn in addition to Bootstrap and Bastion"
  default     = "1"
}

variable "bastion_enabled" {
  type        = bool
  description = "Whether to spawn a Bastion"
  default     = true
}

variable "bastion_proxy_port" {
  type        = number
  description = "Port to use for the Bastion HTTP forward proxy (squid)"
  default     = 3128
}

variable "metalk8s_iso_mode" {
  type        = string
  description = "How to provision the MetalK8s ISO on Bootstrap (can be 'local' or 'remote')"
  default     = "local"
}

variable "metalk8s_iso_source" {
  type        = string
  description = "Source URI for the MetalK8s ISO (can be a local path or public URL)"
  default     = ""
}

variable "metalk8s_iso_destination" {
  type        = string
  description = "Destination of the MetalK8s ISO on Bootstrap"
  default     = "/home/centos/metalk8s.iso"
}
