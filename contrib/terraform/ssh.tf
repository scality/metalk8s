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


resource "null_resource" "ssh_config" {
  triggers = {
    cluster_instance_ids = join(",", local.all_instances)
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
    )}' > ssh_config"
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
