# This state is called right after the upgrade or downgrade

# NOTE: This can be removed in development/2.8
# When upgrading from 2.6.x (or downgrading to 2.6.x) nginx ingress get
# renamed from `nginx-ingress` to `ingress-nginx` we need to cleanup 
# `nginx-ingress` objects when upgrading (and `ingress-nginx` objects when
# downgrading)

{%- if salt.pkg.version_cmp(pillar.metalk8s.cluster_version, '2.7.0') == -1 %}
  {%- set ingress_name = "ingress-nginx-control-plane" %}
{%- else %}
  {%- set ingress_name = "nginx-ingress-control-plane" %}
{%- endif %}

# NOTE: We remove the DaemonSet first and do not remove anything else if this
#       one failed as we do not want to break the ingress controller if we are
#       not able to remove the DaemonSet for controller.
Ensure {{ ingress_name }}-controller DaemonSet no longer exists:
  metalk8s_kubernetes.object_absent:
    - apiVersion: apps/v1
    - kind: DaemonSet
    - name: {{ ingress_name }}-controller
    - namespace: metalk8s-ingress

# List of object to remove (<apiVersion>, <kind>, <name>)
{%- set object_list = [
  ('v1', 'ServiceAccount', ingress_name),
  ('rbac.authorization.k8s.io/v1', 'ClusterRole', ingress_name),
  ('rbac.authorization.k8s.io/v1', 'ClusterRoleBinding', ingress_name),
  ('rbac.authorization.k8s.io/v1', 'Role', ingress_name),
  ('rbac.authorization.k8s.io/v1', 'RoleBinding', ingress_name),
  ('v1', 'Service', ingress_name ~ '-controller')
] %}

# With `ingress-nginx` a ConfigMap is also created
{%- if ingress_name == 'ingress-nginx' %}
  {%- do object_list.extend([
    ('v1', 'ConfigMap', ingress_name ~ '-controller')
  ]) %}
{%- endif %}

{%- for api_version, kind, obj_name in object_list %}

Ensure {{ obj_name }} {{ kind }} no longer exists:
  metalk8s_kubernetes.object_absent:
    - apiVersion: {{ api_version }}
    - kind: {{ kind }}
    - name: {{ obj_name }}
    - namespace: metalk8s-ingress
    - require:
      - metalk8s_kubernetes: Ensure {{ ingress_name }}-controller DaemonSet no longer exists

{%- endfor %}
