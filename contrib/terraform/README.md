# MetalK8s deployment Terraform tooling

This set of [Terraform][1] modules is provided as convenience tooling to deploy
a fully functional MetalK8s cluster. It currently only supports OpenStack,
and requires the [OpenStack provider][2] to be configured locally. Feel free
to submit pull requests if you want to add support for other cloud providers!

[1]: https://www.terraform.io/
[2]: https://www.terraform.io/docs/providers/openstack/index.html

## How to run

After having configured your cloud provider, you can now configure the
execution of `terraform apply` using variables. These variables are defined
in `variables.tf`, along with their description and default values (also see
[the section below](#Inputs)).

You can pass variables using the command-line. For example, to just deploy a
Bastion and Bootstrap nodes (without installing MetalK8s), using the default
network only:

```
terraform apply -var nodes_count=0 -var private_networks=[]
```

To manage your deployment configuration more easily, defining these
variables in a `.tfvars` or `.tfvars.json` file can be useful. More info on
[Terraform documentation](https://www.terraform.io/docs/configuration/variables.html#variable-definitions-tfvars-files).
Using such files can be done with `terraform apply -var-file=my.tfvars`.

To deploy a 3 nodes cluster (_only the Bootstrap node being installed with the
current implementation_), here would be the `.tfvars` to define:

```
nodes_count = 2

private_networks = ["control_plane", "workload_plane"]

metalk8s_iso_source = "/path/to/iso"
metalk8s_bootstrap = true
```

After a `terraform apply`, or `terraform output`, you should see a list of
IPs for you to connect to the spawned VMs using SSH (with user `centos`).
An SSH config file will also be generated for convenience, so you can connect
to nodes using their names:

```
ssh -F ./ssh_config bootstrap
```

## Inputs

| Name | Description | Type | Default |
|------|-------------|:----:|:-----:|
| `bastion_enabled` | Whether to spawn a Bastion | bool | `"true"` |
| `bastion_proxy_port` | Port to use for the Bastion HTTP forward proxy \(squid\) | number | `"3128"` |
| `bastion_setup_tests` | Whether to setup test dependencies on the Bastion | bool | `"false"` |
| `bastion_test_branch` | Which branch to clone for running tests on the Bastion | string | `""` |
| `control_plane_subnet` | Existing subnet to use for the control-plane | string | `""` |
| `control_plane_vip` | VIP to create for the control-plane | string | `"192.168.1.2"` |
| `default_network` | The default network name to use for SSH access | string | `"tenantnetwork1"` |
| `metalk8s_bootstrap` | Whether to install the Bootstrap node | bool | `"false"` |
| `metalk8s_iso_destination` | Destination of the MetalK8s ISO on Bootstrap | string | `"/home/centos/metalk8s.iso"` |
| `metalk8s_iso_mode` | How to provision the MetalK8s ISO on Bootstrap \(can be 'local' or 'remote'\) | string | `"local"` |
| `metalk8s_iso_mountpoint` | Where to mount the MetalK8s ISO on Bootstrap before installation | string | `"/var/tmp/metalk8s"` |
| `metalk8s_iso_source` | Source URI for the MetalK8s ISO \(can be a local path or public URL\) | string | `""` |
| `metalk8s_provision_volumes` | Whether to provision Volumes for Prometheus and AlertManager | bool | `"false"` |
| `nodes_count` | Number of nodes to spawn in addition to Bootstrap and Bastion | string | `"1"` |
| `openstack_flavours` |  | map | `{ bastion = "m1.medium", bootstrap = "m1.large", nodes = = "m1.large" }` |
| `openstack_image_name` | OpenStack configuration | string | `"CentOS-7-x86_64-GenericCloud-1809.qcow2"` |
| `openstack_link_local_ip` | Metadata service used by cloud-init (see https://docs.openstack.org/nova/latest/user/metadata-service.html) | string | `"169.254.169.254"` |
| `private_networks` | Which private networks to use \(or spawn\) | list | `[]` |
| `ssh_key_pair` | The SSH key pair to use for setting up OpenStack VMs | map | `{ private_key = "~/.ssh/terraform", public_key  = "~/.ssh/terraform.pub" }` |
| `worker_uuid` | Use in CI to link a deployment to its worker | string | `""` |
| `workload_plane_subnet` | Existing subnet to use for the workload-plane | string | `""` |
| `workload_plane_vip` | VIP to create for the workload-plane | string | `""` |

_(generated with [terraform-docs](https://github.com/segmentio/terraform-docs))_
