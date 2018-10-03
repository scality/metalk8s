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

[metalk8s:children]
etcd
k8s-cluster

${ proxies_name != "" ?
"[proxies]
${proxies_name}

[proxies:vars]
ansible_become=True
ansible_become_method=sudo
ansible_user=${ssh_user}"
: ""}

[metalk8s:vars]
ansible_become=True
ansible_become_method=sudo
ansible_user=${ssh_user}
${proxy_url != "0" && proxy_url != "" ?
"http_proxy=${proxy_url}
https_proxy=${proxy_url}
no_proxy=localhost,127.0.0.1,${all_servers_ip}"
: ""}

[kube-node:vars]
metalk8s_lvm_drives_vg_metalk8s=['/dev/vdb']
