#!jinja | kubernetes kubeconfig=/etc/kubernetes/admin.conf&context=kubernetes-admin@kubernetes

{%- from "metalk8s/map.jinja" import repo with context %}

apiVersion: v1
kind: ConfigMap
metadata:
  name: ui-branding
  namespace: metalk8s-solutions
data:
  config.json: |
    {
      "url": "https://{{ pillar.metalk8s.api_server.host }}:6443",
      "registry_prefix": "{{ repo.registry_endpoint }}"
    }
  theme.json: |
    {
      "brand": {"primary": "#403e40", "secondary": "#e99121"}
    }
