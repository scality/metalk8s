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

To manage your deployment configuration, define values for these variables in
one or more `.tfvars` (or `.tfvars.json`) files. More info on
[Terraform documentation](https://www.terraform.io/docs/configuration/variables.html#variable-definitions-tfvars-files).
Using such files can be done with e.g.
`terraform apply -var-file=machines.tfvars -var-file=networks.tfvars`.

**NOTE: for Scality employees, deployment on `scality.cloud` is pre-configured.
Simply use the `scality-cloud.tfvars` var file along with your configuration
when running `terraform apply/destroy`.**

See [the `example.tfvars`](./example.tfvars) file for a documented example
configuration.

A useful variable to define is `prefix`. When not provided, this will default
to `"metalk8s-<5 random chars>"`. This prefix is going to be used in naming of
all deployed resources, for easy discovery and cleanup. For example:

```
terraform apply \
  -var-file=scality-cloud.tfvars \
  -var-file=example.tfvars \
  -var=prefix=metalk8s-demo
```

After a `terraform apply`, or `terraform output`, you should see a list of
IPs for you to connect to the spawned VMs using SSH (user depends on the
chosen VM image - see `scality-cloud.tfvars`). The generated SSH keys are
stored in a local `.ssh` directory, along with an SSH config file. These files
are named with the deployment `prefix` (e.g. `metalk8s-<5 chars>`), to allow
multiple deployments simultaneously. Using the SSH config file, you can connect
to machines by name:

```
ssh -F .ssh/<prefix>.config <machine-name>

# With -var=prefix=metalk8s-demo, to connect to bootstrap, this yields:
ssh -F .ssh/metalk8s-demo.config bootstrap
```

## Inputs

This module defines a number of input variables to customize the deployment.
We describe those variables using the following groups:

- Deployment configuration variables:
    - [General](#General-settings)
    - [Machines](#Machines-configuration)
    - [Networks](#Networks-configuration)
    - [MetalK8s](#MetalK8s-configuration)
- Target environment settings (set in `scality-cloud.tfvars`):
    - [OpenStack](#OpenStack-configuration)

### General settings

- **`prefix`** (optional, default to `""`)

  > Prefix to use when naming deployed resources

  _When set to an empty string, the prefix used will be generated using a
  random 5 characters string, e.g. `metalk8s-<random string>`_

- **`rhsm_username`** (optional, default to `""`)

  > Username for accessing RedHat Subscription Manager

  _Only needed if one or more machines are using `image = "rhel7"`_

- **`rhsm_password`** (optional, default to `""`)

  > Password for accessing RedHat Subscription Manager

  _Only needed if one or more machines are using `image = "rhel7"`_

### Machines configuration

- **`bastion`** (required)

  > Description of the Bastion VM to spawn

  Example:

  ```terraform
  bastion = {
    enabled = true, # whether to spawn the Bastion or not
    image   = "centos7", # or "rhel7"
    flavour = "medium", # use T-Shirt sizes, defined in `openstack_flavours`
  }
  ```

- **`bastion_proxy_port`** (optional, default to `3128`)

  > Port to use for the Bastion HTTP forward proxy (squid)

- **`bootstrap`** (required)

  > Description of the Bootstrap VM to spawn

  Example:

  ```terraform
  bootstrap = {
    image   = "centos7", # or "rhel7"
    flavour = "large", # use T-Shirt sizes, defined in `openstack_flavours`
  }
  ```

- **`nodes`** (required)

  > Description of the extra Node VMs to spawn

  Example:

  ```terraform
  nodes = {
    count   = 2, # number of cluster members in addition to the Bootstrap
    image   = "centos7", # or "rhel7"
    flavour = "medium", # use T-Shirt sizes, defined in `openstack_flavours`
  }
  ```

### Networks configuration

- **`control_plane`** (optional)

  > Configuration of the control plane network

  Default:

  ```terraform
  control_plane = {
    "private": false,
    "cidr": "",
    "existing_subnet": "",
  }
  ```

  Example to use an existing private subnet:

  ```terraform
  control_plane = {
    "private": true,
    "existing_subnet": "metalk8s-control-plane-subnet0",
    "cidr": "",
  }
  ```

  Example to spawn a new network and subnet for control plane:

  ```terraform
  control_plane = {
    "private": true,
    "existing_subnet": "",
    "cidr": "172.254.21.0/24",
  }
  ```

- **`workload_plane`** (optional)

  > Configuration of the workload plane network

  _Same default value and same explanations as for `control_plane`, defined
  above._

### MetalK8s configuration

- **`metalk8s_iso`** (required)

  > How to provision the MetalK8s ISO on Bootstrap:
  >
  > - `mode` can be 'local' or 'remote' ('local' relies on SCP, very slow)
  > - `source` matches `mode`, can be a local path or public URL
  > - `destination` defines where to store the ISO
  > - `mountpoint` defines where to mount the ISO

  Default:

  ```terraform
  metalk8s_iso = {
    mode        = "local",
    source      = "", # Disables provisioning
    destination = "",
    mountpoint  = "",
  }
  ```

  Example:

  ```terraform
  metalk8s_iso = {
    mode = "local",
    source = "/path/to/metalk8s.iso",
    destination = "/archives/metalk8s.iso",
    mountpoint = "/mnt/scality/metalk8s",
  }
  ```

- **`metalk8s_bootstrap`** (optional, default to `false`)

  > Whether to install the Bootstrap node

  _Requires an ISO to be provisioned (see `metalk8s_iso` above)._

- **`metalk8s_provision_volumes`** (false)

  > Whether to provision Volumes for Prometheus and AlertManager

  _Requires MetalK8s to be installed on the Bootstrap node._

### OpenStack configuration

**NOTE**: for Scality employees, you can simply use `scality-cloud.tfvars` for
pre-filled values of the following variables.

- **`public_network`** (required)

  > The public network name to use for SSH access

- **`openstack_flavours`** (required)

  > Map of VM flavours, indexed by T-shirt sizes

  _This map's keys are referenced in the `image` values for
  [machine configurations](#Machines-configuration)._

  Example:

  ```terraform
  # You can choose a skewed mapping, for instance:
  openstack_flavours = {
    small  = "m1.large",
    medium = "m1.xlarge",
    large  = "m3.2xlarge",
    xlarge = "m4.3xlarge",
  }
  ```

- **`openstack_images`** (required)

  > Map of available VM image names, indexed by supported OS basename

  Example:

  ```terraform
  openstack_images = {
    centos7 = {
      image = "CentOS-7-x86_64-v7.7-20200210.qcow2",
      user  = "centos",
    },
    rhel7 = {
      image = "RHEL-7-x86_64-v7.7-20200123.qcow2",
      user  = "cloud-user",
    },
  }
  ```

- **`openstack_link_local_ip`** (required)

  > IP address for the metadata service used by cloud-init

  Usually, this is set to `169.254.169.254`.
