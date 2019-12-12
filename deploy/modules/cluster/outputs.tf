output "bastion" {
  value = var.bastion_enabled ? module.bastion.machines[0] : {}
}

output "bootstrap" {
  value = module.bootstrap.machines[0]
}

output "nodes" {
  value = module.nodes.machines
}
