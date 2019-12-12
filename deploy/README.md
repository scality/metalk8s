# MetalK8s deployment Terraform tooling

This set of [Terraform][1] modules is provided as convenience tooling to deploy
a fully functional MetalK8s cluster. It currently only supports OpenStack,
and requires the [OpenStack provider][2] to be configured locally. Feel free
to submit pull requests if you want to add support for other cloud providers!

[1]: https://www.terraform.io/
[2]: https://www.terraform.io/docs/providers/openstack/index.html

## How to run

After having configured your cloud provider, you can now configure the
execution of `terraform apply` using variables. Here's the exhaustive list:

_OpenStack_:

- `openstack_image_name` (default `"CentOS-7-x86_64-GenericCloud-1809.qcow2"`):
  Image name to use for all spawned VMs.
- `openstack_flavour_name` (default `"m1.medium"`): VM flavour to use.

_Networks_:

- `default_network_name` (default `"tenantnetwork1"`): The default network to
  use for remote SSH access (from your host and from the Bastion).
- `use_private_networks` (default `true`): Create and use two private networks
  (instead of the default network) for both workload- and control-plane. Values
  are set arbitrarily by the Terraform module.

_Deployment_:

- `nodes_count` (default `1`): Number of VMs to deploy in addition to the
  Bastion and Bootstrap ones.
- `metalk8s_iso` (default `{ mode = "local", path = "" }`): Description of an
  ISO, needed if you want to install the Bootstrap node. One can provide a
  local path, using `mode = "local"`, or a URL (including credentials, if
  required), using `mode = "remote"`.
- `metalk8s_iso_dest` (default `"/home/centos/metalk8s.iso"`): Path on the
  Bootstrap where to copy the ISO.
- `metalk8s_iso_mountpoint` (default `"/var/tmp/metalk8s"`): Mountpoint for the
  ISO.
- `metalk8s_bootstrap` (default `false`): Whether to install the Bootstrap node.
- `metalk8s_provision_volumes` (default `false`): Whether to provision
  _Volume_ objects (using `SparseLoopDevice`) for Prometheus and AlertManager
  (after deploying Boostrap, with `metalk8s_bootstrap=true`)


For example, to deploy just the Bastion and Bootstrap VMs, using the
default network only:

```
terraform apply -var=nodes_count=0 -var=use_private_networks=false
```

To deploy a 3 nodes cluster (_only the Bootstrap node being installed with the
current implementation_):

```
terraform apply \
  -var=nodes_count=2 \
  -var=metalk8s_iso=/path/to/iso \
  -var=metalk8s_bootstrap=true \
  -var=metalk8s_provision_volumes=true \
```

After a `terraform apply`, or `terraform output`, you should see a list of
IPs for you to connect to the spawned VMs using SSH (with user `centos`).
