---
%{~ for node in nodes ~}
apiVersion: v1
kind: Node
metadata:
  name: ${node.name}
  annotations:
    metalk8s.scality.com/ssh-user: ${node.access_user}
    metalk8s.scality.com/ssh-host: ${node.access_ip}
    metalk8s.scality.com/ssh-key-path: /etc/metalk8s/pki/salt-bootstrap
    metalk8s.scality.com/ssh-sudo: true
  labels:
    metalk8s.scality.com/version: '2.0'
    %{~ for role in node.roles ~}
    node-role.kubernetes.io/${role}: ''
    %{~ end ~}
spec:
  taints:
  - effect: NoSchedule
    key: node-role.kubernetes.io/master
  - effect: NoSchedule
    key: node-role.kubernetes.io/etcd