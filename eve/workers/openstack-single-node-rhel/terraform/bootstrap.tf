resource "openstack_compute_instance_v2" "bootstrap" {
  name        = "${local.prefix}-bootstrap"
  image_name  = var.openstack_image_name
  flavor_name = var.openstack_flavour_name
  key_pair    = openstack_compute_keypair_v2.local_ssh_key.name

  security_groups = [
    openstack_networking_secgroup_v2.bootstrap.name,
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
    user        = "cloud-user"
    private_key = file("~/.ssh/terraform")
  }

  provisioner "file" {
    source      = "${path.module}/scripts"
    destination = "/home/cloud-user/scripts"
  }

  provisioner "remote-exec" {
    inline = [
      "sudo bash scripts/rhsm-register.sh '${var.rhsm_username}' '${var.rhsm_password}'",
    ]
  }

  provisioner "remote-exec" {
    inline = [
      "sudo chmod +x scripts/bootstrap-config.sh",
      "sudo env DEBUG=${tostring(var.debug)} scripts/bootstrap-config.sh",
    ]
  }

  provisioner "remote-exec" {
     when = "destroy"
     on_failure = "continue"
     inline = [
       "sudo subscription-manager unregister",
     ]
  }
}

output "vm_name" {
  value = "${local.prefix}-bootstrap"
}

output "ip" {
  value = openstack_compute_instance_v2.bootstrap.access_ip_v4
}
