variable "metalk8s_iso" {
  type        = string
  description = "Metalk8s ISO file path to upload to bootstrap node"
  default     = ""
}

variable "metalk8s_iso_dest" {
  type        = string
  description = "Location where the Metalk8s ISO will be copied on the bootstrap node"
  default     = "/home/centos/metalk8s.iso"
}

variable "metalk8s_iso_mountpoint" {
  type        = string
  description = "Mountpoint for the Metalk8s ISO"
  default     = "/var/tmp/metalk8s"
}

resource "null_resource" "metalk8s_upload_iso" {
  count = "${var.metalk8s_iso != "" ? 1 : 0}"

  connection {
    host        = openstack_compute_instance_v2.bootstrap.access_ip_v4
    type        = "ssh"
    user        = "centos"
    private_key = file("~/.ssh/terraform")
  }

  depends_on = [
    openstack_compute_instance_v2.bootstrap,
  ]

  provisioner "file" {
    source      = "${var.metalk8s_iso}"
    destination = "${var.metalk8s_iso_dest}"
  }
}

resource "null_resource" "metalk8s_run_bootstrap" {
  count = "${var.metalk8s_iso != "" ? 1 : 0}"

  connection {
    host        = openstack_compute_instance_v2.bootstrap.access_ip_v4
    type        = "ssh"
    user        = "centos"
    private_key = file("~/.ssh/terraform")
  }

  depends_on = [
    null_resource.metalk8s_upload_iso,
  ]

  provisioner "remote-exec" {
    inline = [
      "sudo mkdir -p ${var.metalk8s_iso_mountpoint}",
      "sudo mount -o loop ${var.metalk8s_iso_dest} ${var.metalk8s_iso_mountpoint}",
      "sudo ${var.metalk8s_iso_mountpoint}/bootstrap.sh --verbose",
    ]
  }
}

variable "metalk8s_provision_volumes" {
  type    = bool
  default = false
}

resource "null_resource" "metalk8s_provision_volumes" {
  count = "${var.metalk8s_provision_volumes ? 1 : 0}"

  connection {
    host        = openstack_compute_instance_v2.bootstrap.access_ip_v4
    type        = "ssh"
    user        = "centos"
    private_key = file("~/.ssh/terraform")
  }

  depends_on = [
    null_resource.metalk8s_run_bootstrap
  ]

  provisioner "file" {
    source      = "${path.module}/../../../create-volumes.sh"
    destination = "/home/centos/create-volumes.sh"
  }

  provisioner "remote-exec" {
    inline = [
      "sudo PRODUCT_TXT=${var.metalk8s_iso_mountpoint}/product.txt PRODUCT_MOUNT=${var.metalk8s_iso_mountpoint} bash create-volumes.sh",
    ]
  }
}
