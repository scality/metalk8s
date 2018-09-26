locals {
  etcd_name = ["${concat(
        openstack_compute_instance_v2.etcd.*.name,
        slice(openstack_compute_instance_v2.nodes.*.name,
            0, var.etcd_dedicated == "true" ?
                0 : min(var.etcd_count, local.nodes_server_count)
        )
  )}"]
  masters_name = ["${concat(
        openstack_compute_instance_v2.masters.*.name,
        slice(local.etcd_name,
            0, var.masters_dedicated == "true" ?
                0 : min(var.masters_count, length(local.etcd_name))
        )
  )}"]
  all_servers_name = ["${concat(
        openstack_compute_instance_v2.nodes.*.name,
        openstack_compute_instance_v2.etcd.*.name,
        openstack_compute_instance_v2.masters.*.name
  )}"]
  all_servers_ip = ["${concat(
        openstack_compute_instance_v2.nodes.*.access_ip_v4,
        openstack_compute_instance_v2.etcd.*.access_ip_v4,
        openstack_compute_instance_v2.masters.*.access_ip_v4,
  )}"]
}

data "template_file" "inventory" {
  template        = "${file("inventory.tpl")}"

  vars {
    all_servers   = "${join("\n", formatlist("%s ansible_host=%s",
                            local.all_servers_name,
                            local.all_servers_ip))}"
    etcd_name     = "${join("\n", local.etcd_name)}"
    masters_name  = "${join("\n", local.masters_name)}"
    nodes_name    = "${join("\n", openstack_compute_instance_v2.nodes.*.name)}"
  }
}

resource "local_file" "inventory" {
  content  = "${data.template_file.inventory.rendered}"
  filename = "${local.inventory_file}"
  count    = "${var.inventory_deploy == "true" ? 1 : 0}"
}
