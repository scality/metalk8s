apiVersion: v1
kind: Node
metadata:
  name: $node_name
  labels:
    metalk8s.scality.com/version: "$metalk8s_version"
    node-role.kubernetes.io/master: ''
    node-role.kubernetes.io/etcd: ''
    node-role.kubernetes.io/infra: ''
  annotations:
    metalk8s.scality.com/ssh-user: centos
    metalk8s.scality.com/ssh-port: "22"
    metalk8s.scality.com/ssh-host: $node_ip
    metalk8s.scality.com/ssh-key-path: /etc/metalk8s/pki/salt-bootstrap
    metalk8s.scality.com/ssh-sudo: "true"
