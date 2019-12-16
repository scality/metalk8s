resource "openstack_compute_instance_v2" "machines" {
  count = var.replicas

  name        = var.replicas > 1 ? "${var.name}-${count.index}" : "${var.name}"
  image_name  = var.image_name
  flavor_name = var.flavour_name
  key_pair    = var.key_pair.name

  dynamic "scheduler_hints" {
    # NOTE: trick to optionally render a block
    for_each = var.servergroup != "" ? [{}] : []

    content {
      group = var.servergroup
    }
  }

  security_groups = var.security_groups

  network {
    access_network = true
    name           = var.default_network
  }

  dynamic "network" {
    for_each = var.extra_ports[*][count.index]
    iterator = port

    content {
      access_network = false
      port           = port.value.id
    }
  }

  connection {
    host        = self.access_ip_v4
    type        = "ssh"
    user        = "centos"
    private_key = file(var.key_pair.private_key)
  }

  # Provision scripts for remote-execution
  provisioner "file" {
    source      = "${path.root}/scripts"
    destination = "/home/centos/scripts"
  }

  provisioner "remote-exec" {
    inline = ["chmod -R +x /home/centos/scripts"]
  }

  # Configure network interfaces for private networks
  provisioner "remote-exec" {
    inline = [
      for i in range(length(var.extra_ports)) :
      "sudo bash scripts/network-iface-config.sh eth${i + 1}"
    ]
  }
}

# If requested, generate an SSH keypair
resource "null_resource" "generate_key" {
  count = var.generate_key.enabled ? var.replicas : 0

  connection {
    host        = openstack_compute_instance_v2.machines[count.index].access_ip_v4
    type        = "ssh"
    user        = "centos"
    private_key = file(var.key_pair.private_key)
  }

  provisioner "remote-exec" {
    inline = [
      "ssh-keygen -t rsa -b 4096 -N '' -f ${var.generate_key.path}"
    ]

    # TODO: copy into `/etc/metalk8s/pki` during bootstrap setup
  }
}
