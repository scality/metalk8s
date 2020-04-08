variable "ssh_key_path" {
  type    = string
  default = "~/.ssh/terraform.pub"
}

resource "openstack_compute_keypair_v2" "local_ssh_key" {
  name       = local.prefix
  public_key = file(var.ssh_key_path)
}

resource "null_resource" "ssh_config" {
  # Generate SSH config file for local usage
  provisioner "local-exec" {
    command = "echo '${templatefile(
      "${path.module}/templates/ssh_config.tpl",
      {
        identity_file = "~/.ssh/terraform"
        bootstrap_ip  = openstack_compute_instance_v2.bootstrap.access_ip_v4
        cypress_ip  = openstack_compute_instance_v2.cypress.access_ip_v4
      }
    )}' > ssh_config"
  }
}
