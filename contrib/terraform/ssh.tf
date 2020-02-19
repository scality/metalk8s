locals {
  all_instances = concat(
    local.bastion.enabled ? [openstack_compute_instance_v2.bastion[0].id] : [],
    [openstack_compute_instance_v2.bootstrap.id],
    openstack_compute_instance_v2.nodes[*].id
  )

  nodes_info = [
    for idx in range(length(openstack_compute_instance_v2.nodes)) :
    {
      name = "node${idx + 1}",
      ip   = local.node_ips[idx],
    }
  ]
}


resource "openstack_compute_keypair_v2" "local" {
  name = "${local.prefix}-local"

  # Make a local copy of the keypair for reference in the SSH config file
  provisioner "local-exec" {
    command = join(" && ", [
      "mkdir -p ${path.root}/.ssh",
      "echo '${self.public_key}' > ${path.root}/.ssh/${self.name}.pub",
      "echo '${self.private_key}' > ${path.root}/.ssh/${self.name}",
      "chmod 600 ${path.root}/.ssh/${self.name}*",
    ])
  }

  provisioner "local-exec" {
    when    = destroy
    command = "rm ${path.root}/.ssh/${self.name}*"
  }
}


resource "openstack_compute_keypair_v2" "bastion" {
  name = "${local.prefix}-bastion"
}


resource "openstack_compute_keypair_v2" "bootstrap" {
  name = "${local.prefix}-bootstrap"
}


resource "null_resource" "local_ssh_config" {
  triggers = {
    all_instances = join(",", local.all_instances)
  }

  # Generate SSH config file for local usage
  provisioner "local-exec" {
    command = "echo '${templatefile(
      "${path.module}/templates/ssh_config.tpl",
      {
        identity_file = "${path.root}/.ssh/${local.prefix}-local"
        bastion_ip    = local.bastion_ip
        bootstrap_ip  = local.bootstrap_ip
        nodes         = local.nodes_info
      }
    )}' > ./.ssh/${local.prefix}.config"
  }

  provisioner "local-exec" {
    when    = destroy
    command = "rm ./.ssh/${local.prefix}.config"
  }
}

resource "null_resource" "bastion_ssh_config" {
  triggers = {
    all_instances = join(",", local.all_instances)
  }

  # Generate SSH config file for the Bastion
  provisioner "file" {
    connection {
      host        = local.bastion_ip
      user        = local.bastion.user
      private_key = openstack_compute_keypair_v2.local.private_key
    }

    destination = "/home/${local.bastion.user}/ssh_config"
    content = templatefile(
      "${path.module}/templates/ssh_config.tpl",
      {
        identity_file = "/home/${local.bastion.user}/.ssh/bastion"
        bastion_ip    = local.bastion_ip
        bootstrap_ip  = local.bootstrap_ip
        nodes         = local.nodes_info
      }
    )
  }
}
