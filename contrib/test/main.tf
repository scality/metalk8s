# Versions
terraform {
  required_version = ">= 0.12.21"

  required_providers {
    local = "~> 1.4.0"
    openstack = "~> 1.25.0"
  }
}

locals {
  heat = {
    template_path = "../terraform/heat/template.yaml"
  }
}

locals {
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

resource "local_file" "test" {
  filename = "test.yml"
  content  = local.heat_template
}

# resource "openstack_orchestration_stack_v1" "cluster" {
#   name       = "test-tf-heat"

#   parameters = {}

#   template_opts = {
#     Bin = replace(
#       file(local.heat.template_path),
#       "(?m)type: ([\\w\\-\\.]+)",
#       "type: ${dirname(local.heat.template_path)}/$1",
#     )
#   }

#   environment_opts = {
#     Bin = "\n"
#   }
# }
