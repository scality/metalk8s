{%- from 'metalk8s/kubeadm/init/kubeconfig/lib.sls' import kubeconfig with context %}

{%- set cert_info = {'CN': 'system:kube-scheduler'} %}

{{ kubeconfig('scheduler', cert_info) }}
