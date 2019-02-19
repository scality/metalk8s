{%- from 'metalk8s/kubeadm/init/kubeconfig/lib.sls' import kubeconfig with context %}

{%- set cert_info = {'CN': 'system:kube-controller-manager'} %}

{{ kubeconfig('controller-manager', cert_info) }}
