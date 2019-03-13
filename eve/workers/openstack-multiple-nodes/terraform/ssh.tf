variable "ssh_key_path" {
  type    = "string"
  default = "~/.ssh/terraform.pub"
}

resource "openstack_compute_keypair_v2" "local_ssh_key" {
  name       = "${local.prefix}"
  public_key = "${file(var.ssh_key_path)}"
}
