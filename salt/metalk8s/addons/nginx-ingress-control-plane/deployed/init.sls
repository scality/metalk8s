include:
  - metalk8s.addons.nginx-ingress.deployed.namespace
  - .tls-secret
{#- We use DaemonSet if MetalLB disabled, otherwise we use Deployment #}
{%- if not pillar.networks.control_plane.metalLB.enabled %}
  - .chart-daemonset
{%- else %}
  - .chart-deployment
  - metalk8s.addons.metallb.deployed
{%- endif %}

{%- if not pillar.networks.control_plane.metalLB.enabled %}

Ensure Nginx Ingress Control Plane Deployment does not exist:
  metalk8s_kubernetes.object_absent:
    - apiVersion: apps/v1
    - kind: Deployment
    - name: ingress-nginx-control-plane-controller
    - namespace: metalk8s-ingress
    - require:
      - sls: metalk8s.addons.nginx-ingress.deployed.namespace
      - sls: metalk8s.addons.nginx-ingress-control-plane.deployed.chart-daemonset

Ensure Nginx Ingress Control Plane defaultbackend Deployment does not exist:
  metalk8s_kubernetes.object_absent:
    - apiVersion: apps/v1
    - kind: Deployment
    - name: ingress-nginx-control-plane-defaultbackend
    - namespace: metalk8s-ingress
    - require:
      - sls: metalk8s.addons.nginx-ingress.deployed.namespace
      - sls: metalk8s.addons.nginx-ingress-control-plane.deployed.chart-daemonset

Ensure Nginx Ingress Control Plane defaultbackend Service does not exist:
  metalk8s_kubernetes.object_absent:
    - apiVersion: v1
    - kind: Service
    - name: ingress-nginx-control-plane-defaultbackend
    - namespace: metalk8s-ingress
    - require:
      - sls: metalk8s.addons.nginx-ingress.deployed.namespace
      - sls: metalk8s.addons.nginx-ingress-control-plane.deployed.chart-daemonset

Ensure Nginx Ingress Control Plane defaultbackend ServiceAccount does not exist:
  metalk8s_kubernetes.object_absent:
    - apiVersion: v1
    - kind: ServiceAccount
    - name: ingress-nginx-control-plane-defaultbackend
    - namespace: metalk8s-ingress
    - require:
      - sls: metalk8s.addons.nginx-ingress.deployed.namespace
      - sls: metalk8s.addons.nginx-ingress-control-plane.deployed.chart-daemonset

{%- else %}

Ensure Nginx Ingress Control Plane DaemonSet does not exist:
  metalk8s_kubernetes.object_absent:
    - apiVersion: apps/v1
    - kind: DaemonSet
    - name: ingress-nginx-control-plane-controller
    - namespace: metalk8s-ingress
    - require:
      - sls: metalk8s.addons.nginx-ingress.deployed.namespace
      - sls: metalk8s.addons.nginx-ingress-control-plane.deployed.chart-deployment

{%- endif %}
