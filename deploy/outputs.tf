output "ips" {
  value = {
    bastion           = module.cluster.bastion.access_ip
    bootstrap         = module.cluster.bootstrap.access_ip
    nodes             = [for node in module.cluster.nodes : node.access_ip]
    control_plane_vip = module.control_plane_network.vip
  }
}
