output "machines" {
  value = [
    for machine in openstack_compute_instance_v2.machines :
    {
      id        = machine.id,
      name      = machine.name,
      access_ip = machine.access_ip_v4,
    }
  ]
}
