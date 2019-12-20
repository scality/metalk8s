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


resource "null_resource" "local_ssh_config" {
  triggers = {
    all_instances = join(",", local.all_instances)
  }

  # Generate SSH config file for local usage
  provisioner "local-exec" {
    command = "echo '${templatefile(
      "${path.module}/templates/ssh_config.tpl",
      {
        identity_file = var.ssh_key_pair.private_key
        bastion_ip    = local.bastion_ip
        bootstrap_ip  = local.bootstrap_ip
        nodes         = local.nodes_info
      }
    )}' > ./ssh_config"
  }

  provisioner "local-exec" {
    when    = destroy
    command = "rm ./ssh_config"
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
      user        = "centos"
      private_key = file(var.ssh_key_pair.private_key)
    }

    destination = "/home/centos/ssh_config"
    content = templatefile(
      "${path.module}/templates/ssh_config.tpl",
      {
        identity_file = "/home/centos/.ssh/bastion"
        bastion_ip    = local.bastion_ip
        bootstrap_ip  = local.bootstrap_ip
        nodes         = local.nodes_info
      }
    )
  }
}

resource "null_resource" "bastion_public_key" {
  depends_on = [
    openstack_compute_instance_v2.bastion,
    openstack_compute_instance_v2.bootstrap,
    openstack_compute_instance_v2.nodes,
  ]

  # Share and authorize Bastion key
  provisioner "local-exec" {
    command = <<-EOT
    %{for node_ip in concat([local.bootstrap_ip], local.node_ips)}
    scp -i ${var.ssh_key_pair.private_key} -3 -o StrictHostKeyChecking=no \
        centos@${local.bastion_ip}:.ssh/bastion.pub \
        centos@${node_ip}:.ssh/bastion.pub
    ssh -i ${var.ssh_key_pair.private_key} centos@${node_ip} \
        "cat .ssh/bastion.pub >> .ssh/authorized_keys"
    %{endfor}
    EOT
  }
}

resource "null_resource" "bootstrap_public_key" {
  depends_on = [
    openstack_compute_instance_v2.bootstrap,
    openstack_compute_instance_v2.nodes,
  ]

  # Share and authorize Bootstrap key
  provisioner "local-exec" {
    command = <<-EOT
    %{for node_ip in local.node_ips}
    scp -i ${var.ssh_key_pair.private_key} -3 -o StrictHostKeyChecking=no \
        centos@${local.bootstrap_ip}:.ssh/bootstrap.pub \
        centos@${node_ip}:.ssh/bootstrap.pub
    ssh -i ${var.ssh_key_pair.private_key} centos@${node_ip} \
        "cat .ssh/bootstrap.pub >> .ssh/authorized_keys"
    %{endfor}
    EOT
  }
}
