# metal-k8s
An opinionated Kubernetes distribution with a focus on long-term on-prem deployments

## Quickstart
For the really impatient, there's a [quickstart] available.

[quickstart]: https://metal-k8s.readthedocs.io/en/latest/usage/quickstart.html

## Documentation
The project documentation is available at https://metal-k8s.readthedocs.io.
Sources can be found in the `docs` folder of this repository. Pull-requests
welcome!

## Hardware Requirements

### Test config
If you want to test metal-k8s you just need one simple VM running CentOS 7.4.

### Production Config
For production-ready environment, you need:

- 5 servers
- each server running centos 7.4
- hard-drive dedicated to system
- a "/" partition of at least 20G
- a "/var"/ partition of at least 100G
- 1 extra-drive  of 500Go per-server

## Software Requirements
To get started, all you need is `python` and `make` on a Unix-like system.
