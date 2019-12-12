# FIXME: always assumes a Bastion to exist
variable "cluster" {
  type        = any
  description = "A cluster for which to setup additional SSH access"
}

variable "private_key" {
  type        = string
  description = "Path to the SSH private key to use for provisioning"
}
