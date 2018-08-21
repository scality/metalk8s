There is multiple test-suites for MetalK8s:


1. Installation test-suite: Test installation on process on an empty set of centos 7 servers.
    After running this test-suite, metal-k8s is installed successfully.

2. Post-install test-suite: On an instance of MetalK8s run test to check usability of the cluster.


## Installation test-suite.

To invoke the test-suite you need an inventory with empty centos7 servers.
    Running the process on an already installed cluster, may return false-positive result.

To invoke the test-suite:
```
export ANSIBLE_INVENTORY=~/metalk8s/hosts.ini
tox -e test-install
```

The inventory here is located at `~/metalk8s/hosts.ini`
You can also provide inventory as pytest argument like
```
tox -e test-install -- --inventory ~/metalk8s/hosts.ini
```


## Post-installation test-suite.

This test-suite require also requires an inventory as argument (to be passed the same way).
But the installation process should have been done(by following quickstart guide or running install test-suite)
prior running this test suite.
Running this test-suite on a set of server where MetalK8s is not successfully installed will result as false-negative error.
To invoke this test-suite:
```
export ANSIBLE_INVENTORY=~/metalk8s/hosts.ini
tox -e test
```


