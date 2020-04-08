resource "openstack_compute_instance_v2" "cypress" {
  name        = "${local.prefix}-cypress"
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
    source      = "${path.module}/scripts/cypress-requirements.sh"
    destination = "/home/centos/cypress-requirements.sh"
  }

  provisioner "remote-exec" {
    inline = [
      "bash cypress-requirements.sh",
    ]
  }
}

output "cypress_name" {
  value = "${local.prefix}-cypress"
}

output "cypress_ip" {
  value = openstack_compute_instance_v2.cypress.access_ip_v4
}
