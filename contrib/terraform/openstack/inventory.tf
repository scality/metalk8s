locals {
  # etcd_name are formed bt name of all dedicated etcd server and
  # In the case of shared group: a portion of the of the nodes name
  etcd_name = ["${concat(
        openstack_compute_instance_v2.etcd.*.name,
        slice(openstack_compute_instance_v2.nodes.*.name, 0, local.etcd_on_nodes)
  )}"]

  # Same computation of etcd_name, except that shared master could come from
  # nodes (if etcd server are shared with nodes) or etcd (if etcd are dedicated)
  # but this distinction is abstract by the etcd_name computation above.
  masters_name = ["${concat(
        openstack_compute_instance_v2.masters.*.name,
        slice(local.etcd_name, 0, local.masters_on_etcd)
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
  template = "${file("inventory.tpl")}"

  vars {
    all_servers = "${join("\n", formatlist("%s ansible_host=%s",
                            local.all_servers_name,
                            local.all_servers_ip))}"

    etcd_name    = "${join("\n", local.etcd_name)}"
    masters_name = "${join("\n", local.masters_name)}"
    nodes_name   = "${join("\n", openstack_compute_instance_v2.nodes.*.name)}"
    ssh_user     = "${var.ssh_user}"
  }
}

resource "local_file" "inventory" {
  content  = "${data.template_file.inventory.rendered}"
  filename = "${local.inventory_file}"
  count    = "${var.inventory_deploy ? 1 : 0}"
}
