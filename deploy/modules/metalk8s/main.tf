resource "null_resource" "upload_local_iso" {
  count = var.iso.mode == "local" && var.iso.path != "" ? 1 : 0

  connection {
    host        = var.cluster.bootstrap.access_ip
    type        = "ssh"
    user        = "centos"
    private_key = file(var.private_key)
  }

  provisioner "file" {
    source      = "${var.iso.path}"
    destination = "${var.iso_dest}"
  }
}

resource "null_resource" "download_remote_iso" {
  count = var.iso.mode == "remote" && var.iso.path != "" ? 1 : 0

  provisioner "remote-exec" {
    # NOTE: download through Bastion then copy to Bootstrap, since the latter
    #       is not online
    connection {
      host        = var.cluster.bastion.access_ip
      type        = "ssh"
      user        = "centos"
      private_key = file(var.private_key)
    }

    inline = [
      "curl -o /tmp/metalk8s.iso ${var.iso.path}",
      "scp -F /home/centos/ssh_config /tmp/metalk8s.iso bootstrap:${var.iso_dest}",
      "rm -f /tmp/metalk8s.iso",
    ]
  }
}

resource "null_resource" "configure_bootstrap" {
  count = var.bootstrap ? 1 : 0

  connection {
    host        = var.cluster.bootstrap.access_ip
    type        = "ssh"
    user        = "centos"
    private_key = file(var.private_key)
  }

  provisioner "remote-exec" {
    inline = [
      join(" ", [
        "sudo env",
        "CP_IFACE=${var.control_plane_network.iface}",
        "WP_IFACE=${var.workload_plane_network.iface}",
        "ARCHIVE_PATH=${var.iso_mountpoint}",
        "/home/centos/scripts/prepare-bootstrap.sh",
      ]),
    ]
  }
}

resource "null_resource" "run_bootstrap" {
  count = var.bootstrap ? 1 : 0

  connection {
    host        = var.cluster.bootstrap.access_ip
    type        = "ssh"
    user        = "centos"
    private_key = file(var.private_key)
  }

  depends_on = [
    null_resource.upload_local_iso,
    null_resource.download_remote_iso,
    null_resource.configure_bootstrap,
  ]

  provisioner "remote-exec" {
    inline = [
      "sudo mkdir -p ${var.iso_mountpoint}",
      "sudo mount -o loop ${var.iso_dest} ${var.iso_mountpoint}",
      "sudo ${var.iso_mountpoint}/bootstrap.sh --verbose",
    ]
  }
}

resource "null_resource" "provision_volumes" {
  count = (var.bootstrap && var.provision_volumes) ? 1 : 0

  connection {
    host        = var.cluster.bootstrap.access_ip
    type        = "ssh"
    user        = "centos"
    private_key = file(var.private_key)
  }

  depends_on = [
    null_resource.run_bootstrap,
  ]

  provisioner "remote-exec" {
    inline = [
      join(" ", [
        "sudo env",
        "PRODUCT_TXT=${var.iso_mountpoint}/product.txt",
        "PRODUCT_MOUNT=${var.iso_mountpoint}",
        "/home/centos/scripts/create-volumes.sh",
      ]),
    ]
  }
}