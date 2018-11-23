${all_servers}

[etcd]
${etcd_name}

[kube-master]
${masters_name}

[kube-node]
${nodes_name}

[k8s-cluster:children]
kube-master
kube-node

[k8s-cluster:vars]
ansible_become=True
ansible_become_method=sudo
ansible_user=${ssh_user}

[etcd:vars]
ansible_become=True
ansible_become_method=sudo
ansible_user=${ssh_user}

[kube-node:vars]
metalk8s_lvm_drives_vg_metalk8s=['/dev/vdb']
