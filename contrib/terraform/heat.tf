# Allow creating/importing an orchestration Stack deployed with Heat.
# This entirely shortcuts the deployment configuration provided with variables,
# and derives required actions for installing MetalK8s on the provided
# infrastructure.

locals {
  heat = {
    enabled    = var.heat.enabled,
    stack_name = var.heat.stack_name == "" ? local.prefix : var.heat.stack_name,
    parameters = try(
      jsondecode(file(var.heat.parameters_path)),
      var.heat.parameters
    )
    template_path = (
      var.heat.template_path == ""
      ? "${path.root}/heat/template.yaml"
      : var.heat.template_path
    )
  }
}

locals {
  # XXX: this is a stupid fix for a stupid bug.
  #      This variable is cast as a `map[string]interface{}`, enforcing
  #      constant type for all values. In the meantime, the value for
  #      `Files` is expected to be `map[string]interface`, while `Bin` or
  #      `URL` are supposed to be `string`. So we can't fill in both.
  #      This means we need to manually replace the paths relative to the
  #      root template with paths relative to this Terraform definition.
  heat_template = replace(
    replace(
      file(local.heat.template_path),
      "/type: ([[:word:]]+\\.template)/", # references to resource templates
      "type: ${dirname(local.heat.template_path)}/$1",
    ),
    "/{ get_file: (\\S+) }/", # references to files
    "{ get_file: ${dirname(local.heat.template_path)}/$1 }",
  )
}

resource "openstack_orchestration_stack_v1" "cluster" {
  count = local.heat.enabled ? 1 : 0

  name       = local.heat.stack_name

  parameters = {
    key_pair = "MyKey",
    scality_cloud_token = "gAAAAABeXQrBBT7wzbeEsgQuZIMSpVfVjK3YKxFQFnU_3gbY3Pp7UrurbMBgT0n4Z8ehqNvd3LgXDpCSEERbWMC5U4fVCE7xTYchKvfh5hREx_4LTH9mvFAj_9IVllbOc2BFNH78UbkhsKQe3a87J9VFgGHEgibSpW72HK256RLAEQ1nzn2L9siREElKdcNJ_JB-7jpeslcwMmKlqHgvEg4MQYo49EdhrR55HJbKdVcDHFeNM2sKx-dv1cPvF6WSBa4HGJfkNdMb5L2CmFLuCObEiyEOkwsFOF15zYrC40Ds6ksEIu__wkuDwqWYPbdXiqltVTgKQGZP",
    scality_cloud_region = "Europe",
    access_network_id = "a8b5b41e-8478-483c-b348-ffae653414c2",
    artifacts_password = "jakTafAtId",
    metalk8s_workers_count = 0,
  }

  template_opts = {
    Bin = local.heat_template
  }

  environment_opts = {
    Bin = "\n"
  }
}
