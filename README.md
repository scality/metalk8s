<h1>
    <img src="artwork/generated/metalk8s-logo-wide-black-400.png" width="400" height="100%" alt="MetalK8s logo" title="MetalK8s" />
</h1>

An opinionated Kubernetes distribution with a focus on long-term on-prem deployments

## Contributing

If you'd like to contribute, please review the 
[Contributing Guidelines](CONTRIBUTING.md).

## End-to-End Testing
### Requirements

- [Python3.4+](https://www.python.org/)
- [tox](https://pypi.org/project/tox)
- [Vagrant](https://www.vagrantup.com/)
- [VirtualBox](https://www.virtualbox.org)

### Usage

To run tests locally:
```shell
# Bootstrap a platform on a vagrant environment using
doit vagrantup
# Generate an ssh-config file from vagrant
vagrant ssh-config >bootstrap.ssh.config
# Run tox with two environment variables
# The test command should be in that case
SSH_CONFIG_FILE=bootstrap.ssh.config SSH_HOSTS_LIST=bootstrap tox -e tests
```
