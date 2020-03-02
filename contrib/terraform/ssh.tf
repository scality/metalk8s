locals {
  access_keypair = {
    generate = var.access_keypair.generate
    public_key = try(
      file(var.access_keypair.public_key_path),
      var.access_keypair.public_key,
    )
    private_key = try(
      file(var.access_keypair.private_key_path),
      var.access_keypair.private_key
    )
  }
}

resource "openstack_compute_keypair_v2" "local" {
  name = "${local.prefix}-local"

  public_key = (
    local.access_keypair.generate ? "" : local.access_keypair.public_key
  )

  # Make a local copy of the keypair for reference in the SSH config file
  provisioner "local-exec" {
    command = join(" && ", [
      "mkdir -p ${path.root}/.ssh",
      "echo '${self.public_key}' > ${path.root}/.ssh/${self.name}.pub",
      "echo '${
        local.access_keypair.generate
        ? self.private_key
        : local.access_keypair.private_key
      }' > ${path.root}/.ssh/${self.name}",
      "chmod 600 ${path.root}/.ssh/${self.name}*",
    ])
  }

  provisioner "local-exec" {
    when    = destroy
    command = "rm ${path.root}/.ssh/${self.name}*"
  }
}

locals {
  access_private_key = (
    local.access_keypair.generate
    ? openstack_compute_keypair_v2.local.private_key
    : local.access_keypair.private_key
  )
}


resource "openstack_compute_keypair_v2" "bastion" {
  count = local.bastion.enabled ? 1 : 0
  name  = "${local.prefix}-bastion"
}


resource "openstack_compute_keypair_v2" "bootstraps" {
  for_each = toset(keys(var.metalk8s_clusters))

  name = "${local.prefix}-${each.key}-bootstrap"
}


resource "null_resource" "local_ssh_config" {
  triggers = {
    all_instances = join(",", concat(
      openstack_compute_instance_v2.bastion[*].id,
      [for m in values(openstack_compute_instance_v2.machines) : m.id],
    ))
  }

  # Generate SSH config file for local usage
  provisioner "local-exec" {
    command = "mkdir -p ${path.root}/.ssh && echo '${templatefile(
      "${path.module}/templates/ssh_config.tpl",
      {
        identity_file = "${path.root}/.ssh/${local.prefix}-local",
        bastion = {
          user      = local.bastion.user,
          access_ip = local.bastion_info.access_ip,
        },
        machines = flatten([
          for group, machines in local.machines_info :
          [
            for name, machine in machines :
            {
              name      = name,
              user      = local.machine_groups[group].user,
              access_ip = machine.access_ip,
            }
          ]
        ]),
      }
    )}' > ./.ssh/${local.prefix}.config"
  }

  provisioner "local-exec" {
    when    = destroy
    command = "rm ./.ssh/${local.prefix}.config"
  }
}

resource "null_resource" "bastion_ssh_config" {
  count = local.bastion.enabled && ! local.heat.enabled ? 1 : 0

  triggers = {
    all_instances = join(",", concat(
      openstack_compute_instance_v2.bastion[*].id,
      [for m in values(openstack_compute_instance_v2.machines) : m.id],
    ))
  }

  # Generate SSH config file for the Bastion
  provisioner "remote-exec" {
    connection {
      host        = local.bastion_info.access_ip
      user        = local.bastion.user
      private_key = local.access_private_key
    }

    inline = [
      "echo '${templatefile(
        "${path.module}/templates/ssh_config.tpl",
        {
          identity_file = "/etc/ssh/ssh_host_rsa_key"
          bastion = {
            user      = local.bastion.user,
            access_ip = local.bastion_info.access_ip,
          },
          machines = flatten([
            for group, machines in local.machines_info :
            [
              for name, machine in machines :
              {
                name      = name,
                user      = local.machine_groups[group].user,
                access_ip = machine.access_ip,
              }
            ]
          ]),
        }
      )}' | sudo tee /etc/ssh/ssh_config"
    ]
  }
}
