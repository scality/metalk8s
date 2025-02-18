# this state needs to be removed in MetalK8S 131.0
{%- set daemonset = salt.metalk8s_kubernetes.get_object(
      kind="DaemonSet", apiVersion="apps/v1", name="ingress-nginx-controller", namespace="metalk8s-ingress") %}
{%- if daemonset is not none %}

include:
  - .chart

{%- set ingress_nginx_objects = [
      { "kind": "ServiceAccount" },
      { "kind": "ClusterRole", "apiVersion": "rbac.authorization.k8s.io/v1" },
      { "kind": "ClusterRoleBinding", "apiVersion": "rbac.authorization.k8s.io/v1" },
      { "kind": "Role", "apiVersion": "rbac.authorization.k8s.io/v1" },
      { "kind": "RoleBinding", "apiVersion": "rbac.authorization.k8s.io/v1" },
      { "kind": "Service", "name": "ingress-nginx-controller-metrics" },
      { "kind": "Service", "name": "ingress-nginx-controller" },
      { "kind": "DaemonSet", "apiVersion": "apps/v1", "name": "ingress-nginx-controller" },
      { "kind": "IngressClass", "apiVersion": "networking.k8s.io/v1", "name": "nginx" },
      { "kind": "ServiceMonitor", "apiVersion": "monitoring.coreos.com/v1", "name": "ingress-nginx-controller" },
    ] %}

{%- for obj in ingress_nginx_objects %}

{%- do obj.setdefault("name", "ingress-nginx") %}
{%- do obj.setdefault("apiVersion", "v1") %}

Update metadata for {{ obj["kind"] }}:{{ obj["name"] }}:
  metalk8s_kubernetes.object_updated:
    - name: {{ obj["name"] }}
    - kind: {{ obj["kind"] }}
    - apiVersion: {{ obj["apiVersion"] }}
    - namespace: metalk8s-ingress
    {%- if obj["kind"] == "ServiceMonitor" %}
    - content_type: "application/merge-patch+json"
    {%- endif %}
    - patch:
        metadata:
          labels:
            app.kubernetes.io/managed-by: Helm
          annotations:
            meta.helm.sh/release-name: ingress-nginx
            meta.helm.sh/release-namespace: metalk8s-ingress
    - require_in:
      - sls: metalk8s.addons.nginx-ingress.deployed.chart

{%- endfor %}
{%- endif %}
