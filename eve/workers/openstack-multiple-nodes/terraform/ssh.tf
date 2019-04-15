variable "ssh_key_path" {
  type    = "string"
  default = "~/.ssh/terraform.pub"
}

resource "openstack_compute_keypair_v2" "local_ssh_key" {
  name       = "${local.prefix}"
  public_key = "${file(var.ssh_key_path)}"
}


data "template_file" "local_ssh_config" {
  template = "${file("${path.module}/templates/ssh_config.tpl")}"
  vars = {
    identity_file = "~/.ssh/terraform"
    bastion_ip = "${local.bastion_ip}"
    bootstrap_ip = "${local.bootstrap_ip}"

    # TODO: use Terraform v0.12 syntax once released
    # nodes = [
    #   for node in openstack_compute_instance_v2.nodes:
    #   {
    #     name = "node-${count.index}"  # May not work
    #     ip   = node.network[0].fixed_ip_v4
    #   }
    # ]
  }
}

data "template_file" "bastion_ssh_config" {
  template = "${file("${path.module}/templates/ssh_config.tpl")}"
  vars = {
    identity_file = "/home/centos/.ssh/bastion"
    bastion_ip = "${local.bastion_ip}"
    bootstrap_ip = "${local.bootstrap_ip}"

    # nodes = []  # TODO: see above
  }
}

resource "null_resource" "ssh_config" {
  triggers {
    cluster_instance_ids = "${join(",", local.all_instances)}"
  }

  # Generate SSH config file for local usage
  provisioner "local-exec" {
    command = "echo '${data.template_file.local_ssh_config.rendered}' > ssh_config"
  }

  # Generate SSH config file for the Bastion
  provisioner "file" {
    connection {
      host = "${local.bastion_ip}"
      user        = "centos"
      private_key = "${file("~/.ssh/terraform")}"
    }

    content = "${data.template_file.bastion_ssh_config.rendered}"
    destination = "/home/centos/ssh_config"
  }
}