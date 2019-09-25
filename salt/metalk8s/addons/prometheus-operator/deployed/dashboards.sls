#!jinja | kubernetes kubeconfig=/etc/kubernetes/admin.conf&context=kubernetes-admin@kubernetes

{%- set dashboards = [
    ]
%}

{% for dashboard in dashboards %}
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: {{ dashboard.name }}-dashboard
  namespace: metalk8s-monitoring
  labels:
    app.kubernetes.io/managed-by: salt
    app.kubernetes.io/part-of: metalk8s
    grafana_dashboard: '1'
    heritage: metalk8s
data:
{% set content = salt['metalk8s_grafana.load_dashboard'](
       'salt://' + slspath + '/files/' + dashboard.name + '.json',
       saltenv=saltenv,
       title=dashboard.get('title'),
       tags=dashboard.get('tags'),
       datasource_variable='DS_PROMETHEUS',
   )
%}
  {{ dashboard.name }}.json: {{ content | json | yaml_dquote }}
{% endfor %}
