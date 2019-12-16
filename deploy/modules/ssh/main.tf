locals {
  all_instances = concat(
    [var.cluster.bastion.id, var.cluster.bootstrap.id],
    var.cluster.nodes[*].id
  )

  nodes_info = [
    for idx in range(length(var.cluster.nodes)) :
    { name = "node-${idx + 1}", ip = var.cluster.nodes[idx].access_ip }
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
        identity_file = var.private_key
        bastion_ip    = var.cluster.bastion.access_ip
        bootstrap_ip  = var.cluster.bootstrap.access_ip
        nodes         = local.nodes_info
      }
    )}' > ./ssh_config"
  }

  provisioner "local-exec" {
    when    = "destroy"
    command = "rm ./ssh_config"
  }

  # Generate SSH config file for the Bastion
  provisioner "file" {
    connection {
      host        = var.cluster.bastion.access_ip
      user        = "centos"
      private_key = file(var.private_key)
    }

    destination = "/home/centos/ssh_config"
    content = templatefile(
      "${path.module}/templates/ssh_config.tpl",
      {
        identity_file = "/home/centos/.ssh/bastion"
        bastion_ip    = var.cluster.bastion.access_ip
        bootstrap_ip  = var.cluster.bootstrap.access_ip
        nodes         = local.nodes_info
      }
    )
  }
}

resource "null_resource" "bastion_public_key" {
  # Share and authorize Bastion key
  provisioner "local-exec" {
    command = <<-EOT
    %{for node in concat([var.cluster.bootstrap], var.cluster.nodes)}
    scp -i ${var.private_key} -3 -o StrictHostKeyChecking=no \
        centos@${var.cluster.bastion.access_ip}:.ssh/bastion.pub \
        centos@${node.access_ip}:.ssh/bastion.pub
    ssh -i ${var.private_key} centos@${node.access_ip} \
        "cat .ssh/bastion.pub >> .ssh/authorized_keys"
    %{endfor}
    EOT
  }
}

resource "null_resource" "bootstrap_public_key" {
  # Share and authorize Bootstrap key
  provisioner "local-exec" {
    command = <<-EOT
    %{for node in var.cluster.nodes}
    scp -i ${var.private_key} -3 -o StrictHostKeyChecking=no \
        centos@${var.cluster.bootstrap.access_ip}:.ssh/bootstrap.pub \
        centos@${node.access_ip}:.ssh/bootstrap.pub
    ssh -i ${var.private_key} centos@${node.access_ip} \
        "cat .ssh/bootstrap.pub >> .ssh/authorized_keys"
    %{endfor}
    EOT
  }
}
