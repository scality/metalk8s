locals {
  bastion = {
    enabled     = var.bastion_enabled,
    proxy_port  = var.bastion_proxy_port,
  }
}

resource "openstack_compute_instance_v2" "bastion" {
  count = local.bastion.enabled ? 1 : 0

  name        = "${local.prefix}-bastion"
  image_name  = var.openstack_image_name
  flavor_name = var.openstack_flavours.bastion
  key_pair    = openstack_compute_keypair_v2.local_ssh_key.name

  security_groups = concat(
    [openstack_networking_secgroup_v2.nodes.name],
    openstack_networking_secgroup_v2.bastion[*].name,
  )

  network {
    access_network = true
    name           = data.openstack_networking_network_v2.default_network.name
  }

  connection {
    host        = self.access_ip_v4
    type        = "ssh"
    user        = "centos"
    private_key = file(var.ssh_key_pair.private_key)
  }

  # Provision scripts for remote-execution
  provisioner "file" {
    source      = "${path.root}/scripts"
    destination = "/home/centos/scripts"
  }

  provisioner "remote-exec" {
    inline = ["chmod -R +x /home/centos/scripts"]
  }

  # Generate an SSH keypair
  provisioner "remote-exec" {
    inline = [
      "ssh-keygen -t rsa -b 4096 -N '' -f /home/centos/.ssh/bastion"
    ]
  }
}

locals {
  bastion_ip = (
    local.bastion.enabled
    ? openstack_compute_instance_v2.bastion[0].access_ip_v4
    : ""
  )
}

# HTTP proxy for selective online access from Bootstrap or Nodes
resource "null_resource" "bastion_http_proxy" {
  count = local.bastion.enabled ? 1 : 0

  depends_on = [openstack_compute_instance_v2.bastion]

  connection {
    host        = openstack_compute_instance_v2.bastion[0].access_ip_v4
    type        = "ssh"
    user        = "centos"
    private_key = file(var.ssh_key_pair.private_key)
  }

  # Prepare Squid configuration
  provisioner "file" {
    destination = "/home/centos/squid.conf"
    content = templatefile(
      "${path.module}/templates/squid.conf.tpl",
      {
        src_cidr   = data.openstack_networking_subnet_v2.default_subnet.cidr,
        proxy_port = local.bastion.proxy_port,
      }
    )
  }

  provisioner "remote-exec" {
    inline = [
      # Install Squid
      "sudo yum -y install squid",
      # Configure Squid
      "sudo cp /home/centos/squid.conf /etc/squid/squid.conf",
      "sudo chown root:squid /etc/squid/squid.conf",
      # Enable and start Squid
      "sudo systemctl enable squid",
      "sudo systemctl start squid",
    ]
  }
}
