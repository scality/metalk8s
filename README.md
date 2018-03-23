# metal-k8s
An opinionated Kubernetes distribution with a focus on long-term on-prem deployments

# Hardware prerequisite

## Test config
If you want  to test metal-k8s you just need one simple VM running ubuntu
 16.04

## Production Config
For production-ready environment, you need:

- 5 servers
- each server running ubuntu 16.04
- hard-drive dedicated to system
- a "/" partition of at least 20G
- a "/var"/ partition of at least 100G
- 1 extra-drive  of 500Go per-server


## Software prerequisite for host running metal-k8s

###  Install
You need ansible. You can create a virtualenv
```
cd metal-k8s
virtualenv venv
source ./venv/bin/activate
pip install ansible
```

## Inventory file
Create an inventory file somewhere on the file system. You can make use of
`inventories` directory, but it's ignore from git by default, so make sure to
not store precious data under this directory

For example in `inventories/example.cfg'

```
node1 ansible_ssh_host=95.54.0.12

[kube-master]
node1

[etcd]
node1

[kube-node]
node1


[k8s-cluster:children]
kube-node
kube-master

```

## Roll !
If you pocede all the step above, you can launch the `metal-k8s.yml`:

```
ansible-playbook -i inventories/example.cfg metal-k8s.yml
```

## Usage
You also need `kubectl` and `helm` binary to play with your cluster from your
local computer.

Please refer to the official documentation to install those tools:

- https://kubernetes.io/docs/tasks/tools/install-kubectl/
- https://docs.helm.sh/using_helm/#installing-helm
