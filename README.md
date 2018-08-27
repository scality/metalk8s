<h1>
    <img src="artwork/generated/metalk8s-logo-wide-black-400.png" width="400" height="100%" alt="MetalK8s logo" title="MetalK8s" />
</h1>

An opinionated Kubernetes distribution with a focus on long-term on-prem deployments

## Quickstart
For the really impatient, there's a [quickstart] available.

[quickstart]: https://metal-k8s.readthedocs.io/en/latest/usage/quickstart.html

## Documentation
The project documentation is available at https://metal-k8s.readthedocs.io.
Sources can be found in the `docs` folder of this repository. Pull-requests
welcome!

## Requirements
### Cluster Nodes
To run a test cluster, one or more VMs running CentOS 7.4 or higher should do.
Every server requires a 80GB storage drive.

For production use, we recommend at least

- 5 servers
- Each server running CentOS 7.4 or higher (this is the only supported
  distribution)
- Dedicated system storage on every server, including

  * 20GB for `/`
  * 100GB for `/var`

- An extra drive of at least 80GB for Kubernetes `PersistentVolume` storage

### Software
On the host from which the cluster is provisioned, all you need is `python` and
`make` on a Unix-like system. On some platforms, Python development packages
(`python-dev` or `python-devel`) and a compiler (`gcc`) may need to be
installed.
