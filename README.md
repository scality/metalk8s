<h1>
    <img src="artwork/generated/metalk8s-logo-wide-black-400.png" width="400" height="100%" alt="MetalK8s logo" title="MetalK8s" />
</h1>

An opinionated Kubernetes distribution with a focus on long-term on-prem deployments

## Building

To build a MetalK8s ISO, simply type `./doit.sh`.

For more information, please refers to developer documentation.

## Contributing

If you'd like to contribute, please review the
[Contributing Guidelines](CONTRIBUTING.md).

## Testing
### Requirements

- [Python3.6+](https://www.python.org/)
- [tox](https://pypi.org/project/tox)
- [Vagrant](https://www.vagrantup.com/)
- [VirtualBox](https://www.virtualbox.org)

### Bootstrapping a local environment

```shell
# Install virtualbox guest addition plugin
vagrant plugin install vagrant-vbguest
# Bootstrap a platform on a vagrant environment using
./doit.sh vagrant_up
```

### End-to-End Testing

To run the test-suite locally, first complete the bootstrap step as outline above

```shell
# Run tests with tox
tox -e tests
```

## Documentation
### Requirements
- [Python3.6+](https://www.python.org/)
- [tox](https://pypi.org/project/tox)
- [Plantuml](http://plantuml.com/starting)

### Building

To generate HTML documentation locally in `docs/_build/html`, run the following command:

```shell
# Generate doc with tox
tox -e docs
```

---

MetalK8s version 1 is still maintained in this repository. See the
`development/1.*` branches, e. g.
[MetalK8s 1.3](https://github.com/scality/metalk8s/tree/development/1.3) in the same
repository.
