include:
  - .certs
{%- if not (pillar.is_bootstrap | default(False)) %}
{#- Do not deploy the kubeconfig during the bootstrap process
    since it might be deployed before kube-apiserver is ready #}
  - .kubeconfig
{%- endif %}
  - .configured
  - .installed
