locals {
  metalk8s_iso = {
    mode        = var.metalk8s_iso_mode,
    source      = var.metalk8s_iso_source,
    destination = var.metalk8s_iso_destination,
  }
}

resource "null_resource" "upload_local_iso" {
  count = (
    local.metalk8s_iso.mode == "local" && local.metalk8s_iso.source != ""
  ) ? 1 : 0

  depends_on = [
    openstack_compute_instance_v2.bootstrap,
  ]

  connection {
    host        = local.bootstrap_ip
    type        = "ssh"
    user        = "centos"
    private_key = file(var.ssh_key_pair.private_key)
  }

  provisioner "file" {
    source      = local.metalk8s_iso.source
    destination = local.metalk8s_iso.destination
  }
}

resource "null_resource" "download_remote_iso" {
  count = (
    local.metalk8s_iso.mode == "remote" && local.metalk8s_iso.source != ""
  ) ? 1 : 0

  depends_on = [
    null_resource.bootstrap_use_proxy,
  ]

  provisioner "remote-exec" {
    connection {
      host        = local.bootstrap_ip
      type        = "ssh"
      user        = "centos"
      private_key = file(var.ssh_key_pair.private_key)
    }

    inline = [
      join(" ", compact([
        local.bastion.enabled
        ? "http_proxy=http://${local.bastion_ip}:${local.bastion.proxy_port} https_proxy=$http_proxy"
        : "",
        "curl -o ${local.metalk8s_iso.destination} ${local.metalk8s_iso.source}",
      ])),
    ]
  }
}
