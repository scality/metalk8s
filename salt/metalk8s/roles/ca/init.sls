include:
  - metalk8s.kubernetes.ca
  - metalk8s.kubernetes.sa
  - metalk8s.addons.nginx-ingress.ca
{%- if pillar.addons.dex.enabled %}
  - metalk8s.addons.dex.ca
{%- endif %}
  - metalk8s.backup.certs.ca
