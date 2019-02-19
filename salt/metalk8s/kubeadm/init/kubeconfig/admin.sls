{%- from 'metalk8s/kubeadm/init/kubeconfig/lib.sls' import kubeconfig with context %}

{%- set cert_info = {'CN': 'kubernetes-admin', 'O': 'system:masters'} %}

{{ kubeconfig('admin', cert_info) }}
