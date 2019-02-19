{%- from 'metalk8s/kubeadm/init/kubeconfig/lib.sls' import kubeconfig with context %}

{%- set hostname = salt.network.get_hostname() %}

{%- set cert_info = {'CN': 'system:node:' ~ hostname, 'O': 'system:nodes'} %}

{{ kubeconfig('kubelet', cert_info) }}
