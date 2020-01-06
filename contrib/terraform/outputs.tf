output "ips" {
  value = {
    bastion   = local.bastion_ip
    bootstrap = local.bootstrap_ip
    nodes     = local.node_ips
    control_plane_vip = (
      local.control_plane_vip != ""
      ? openstack_networking_port_v2.control_plane_vip[0].all_fixed_ips[0]
      : ""
    )
  }
}
