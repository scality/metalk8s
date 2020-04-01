resource "openstack_compute_instance_v2" "bootstrap" {
  name        = "${local.prefix}-bootstrap"
  image_name  = var.openstack_image_name
  flavor_name = var.openstack_flavour_name
  key_pair    = openstack_compute_keypair_v2.local_ssh_key.name

  security_groups = [
    openstack_networking_secgroup_v2.nodes.name,
  ]

  dynamic "network" {
    for_each = [
      var.openstack_network,
    ]

    content {
      name = network.value.name
    }
  }

  depends_on = [
  ]

  connection {
    host        = self.access_ip_v4
    type        = "ssh"
    user        = "centos"
    private_key = file("~/.ssh/terraform")
  }

  provisioner "file" {
    source      = "${path.module}/scripts/bootstrap-config.sh"
    destination = "/home/centos/bootstrap-config.sh"
  }

  provisioner "remote-exec" {
    inline = [
      "sudo bash bootstrap-config.sh",
    ]
  }
}

output "bootstrap_name" {
  value = "${local.prefix}-bootstrap"
}

output "bootstrap_ip" {
  value = openstack_compute_instance_v2.bootstrap.access_ip_v4
}
