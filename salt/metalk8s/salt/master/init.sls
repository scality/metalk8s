include:
  - .certs
{%- if not pillar.is_bootstrap %}  
  - .kubeconfig
{%- endif %}
  - .configured
  - .installed
