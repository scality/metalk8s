variable "ssh_key_path" {
  type    = string
  default = "~/.ssh/terraform.pub"
}

variable "ssh_user_map" {
  type    = map
  default = {
    "centos-7"  = "centos",
    "rhel-7"    = "cloud-user"
    "rhel-8"    = "cloud-user"
  }
}

# To override the global ssh_user
# If this variable is set we ignore the `ssh_user_map`
variable "ssh_user" {
  type    = string
  default = ""
}

locals {
  ssh_user  = var.ssh_user != "" ? var.ssh_user : var.ssh_user_map[var.os]
}

resource "openstack_compute_keypair_v2" "local_ssh_key" {
  name       = local.prefix
  public_key = file(var.ssh_key_path)
}

resource "null_resource" "copy_bastion_pub_to_bootstrap" {
  triggers = {
    cluster_instance_ids = join(",", local.all_instances)
  }

  provisioner "local-exec" {
    command = "scp -3 -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -i \"~/.ssh/terraform\" centos@${local.bastion_ip}:/home/centos/.ssh/bastion.pub ${local.ssh_user}@${local.bootstrap_ip}:/tmp/bastion.pub"
  }
  provisioner "remote-exec" {
    connection {
      host        = local.bootstrap_ip
      user        = local.ssh_user
      private_key = file("~/.ssh/terraform")
    }
    inline  = [
      "cat /tmp/bastion.pub >> /home/${local.ssh_user}/.ssh/authorized_keys"
    ]
  }
}

resource "null_resource" "copy_bastion_pub_to_nodes" {
  triggers = {
    cluster_instance_ids = join(",", local.all_instances)
  }

  provisioner "local-exec" {
    command = "scp -3 -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -i \"~/.ssh/terraform\" centos@${local.bastion_ip}:/home/centos/.ssh/bastion.pub ${local.ssh_user}@${local.nodes[count.index].ip}:/tmp/bastion.pub"
  }
  provisioner "remote-exec" {
    connection {
      host        = local.nodes[count.index].ip
      user        = local.ssh_user
      private_key = file("~/.ssh/terraform")
    }
    inline  = [
      "cat /tmp/bastion.pub >> /home/${local.ssh_user}/.ssh/authorized_keys"
    ]
  }
  count = var.nodes_count
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
        user          = local.ssh_user
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
        user          = local.ssh_user
        bastion_ip    = local.bastion_ip
        bootstrap_ip  = local.bootstrap_ip
        nodes         = local.nodes
      }
    )
  }
}
