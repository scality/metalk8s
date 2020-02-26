# Allow creating/importing an orchestration Stack deployed with Heat.
# This entirely shortcuts the deployment configuration provided with variables,
# and derives required actions for installing MetalK8s on the provided
# infrastructure.

locals {
  heat = {
    enabled = var.heat.enabled,
    stack_name = var.heat.stack_name == "" ? local.prefix : var.heat.stack_name,
    parameters = (
      fileexists(var.heat.parameters_path)
      ? jsondecode(file(var.heat.parameters_path))
      : var.heat.parameters
    )
    template_opts = (
      fileexists(var.heat.template_path)
      ? file(var.heat.template_path)
      : file("${path.root}/../heat/template.yaml")
    )
    environment_opts = (
      fileexists(var.heat.environment_path)
      ? file(var.heat.environment_path)
      : ""
    )
  }
}

resource "openstack_orchestration_stack_v1" "cluster" {
  count = local.heat.enabled ? 1 : 0

  name = local.heat.stack_name
  parameters = local.heat.parameters
  template_opts = {
    Bin = local.heat.template_opts,
  }
  environment_opts = {
    Bin = local.heat.environment_opts,
  }
}
