variable "ssh_key_path" {
  type    = string
  default = "~/.ssh/terraform.pub"
}

resource "openstack_compute_keypair_v2" "local_ssh_key" {
  name       = local.prefix
  public_key = file(var.ssh_key_path)
  }

resource "null_resource" "ssh_config" {
  triggers = {
    cluster_instance_ids = join(",", local.all_instances)
  }

  # Generate SSH config file for local usage
  provisioner "local-exec" {
    command = "echo '${templatefile(
      "${path.module}/templates/ssh_config.tpl",
      {
        identity_file = "~/.ssh/terraform"
        bastion_ip    = local.bastion_ip
        bootstrap_ip  = local.bootstrap_ip
        nodes         = local.nodes
      }
    )}' > ssh_config"
  }

  # Generate SSH config file for the Bastion
  provisioner "file" {
    connection {
      host        = local.bastion_ip
      user        = "centos"
      private_key = file("~/.ssh/terraform")
    }

    destination = "/home/centos/ssh_config"
    content = templatefile(
      "${path.module}/templates/ssh_config.tpl",
      {
        identity_file = "/home/centos/.ssh/bastion"
        bastion_ip    = local.bastion_ip
        bootstrap_ip  = local.bootstrap_ip
        nodes         = local.nodes
      }
    )
  }
}
