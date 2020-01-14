output "ips" {
  value = {
    bastion   = local.bastion_ip
    bootstrap = local.bootstrap_ip
    nodes     = local.node_ips
  }
}
