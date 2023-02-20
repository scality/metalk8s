include:
  - metalk8s.addons.nginx-ingress.deployed.namespace
  - .tls-secret
  - .chart-daemonset

{#- Make sure to remove old MetalLB related objects #}
{#- This logic can be removed in `development/126.0` #}
Ensure Nginx Ingress Control Plane Deployment does not exist:
  metalk8s_kubernetes.object_absent:
    - apiVersion: apps/v1
    - kind: Deployment
    - name: ingress-nginx-control-plane-controller
    - namespace: metalk8s-ingress
    - wait:
        attempts: 30
        sleep: 10
    - require:
      - sls: metalk8s.addons.nginx-ingress.deployed.namespace
      - sls: metalk8s.addons.nginx-ingress-control-plane.deployed.chart-daemonset

Ensure Nginx Ingress Control Plane defaultbackend Deployment does not exist:
  metalk8s_kubernetes.object_absent:
    - apiVersion: apps/v1
    - kind: Deployment
    - name: ingress-nginx-control-plane-defaultbackend
    - namespace: metalk8s-ingress
    - wait:
        attempts: 30
        sleep: 10
    - require:
      - sls: metalk8s.addons.nginx-ingress.deployed.namespace
      - sls: metalk8s.addons.nginx-ingress-control-plane.deployed.chart-daemonset

Ensure Nginx Ingress Control Plane defaultbackend Service does not exist:
  metalk8s_kubernetes.object_absent:
    - apiVersion: v1
    - kind: Service
    - name: ingress-nginx-control-plane-defaultbackend
    - namespace: metalk8s-ingress
    - wait:
        attempts: 30
        sleep: 10
    - require:
      - sls: metalk8s.addons.nginx-ingress.deployed.namespace
      - sls: metalk8s.addons.nginx-ingress-control-plane.deployed.chart-daemonset

Ensure Nginx Ingress Control Plane defaultbackend ServiceAccount does not exist:
  metalk8s_kubernetes.object_absent:
    - apiVersion: v1
    - kind: ServiceAccount
    - name: ingress-nginx-control-plane-defaultbackend
    - namespace: metalk8s-ingress
    - wait:
        attempts: 30
        sleep: 10
    - require:
      - sls: metalk8s.addons.nginx-ingress.deployed.namespace
      - sls: metalk8s.addons.nginx-ingress-control-plane.deployed.chart-daemonset

Ensure MetalLB Namespace does not exist:
  metalk8s_kubernetes.object_absent:
    - apiVersion: v1
    - kind: Namespace
    - name: metalk8s-loadbalancing
    - wait:
        attempts: 30
        sleep: 10
    - require:
      - sls: metalk8s.addons.nginx-ingress.deployed.namespace
      - sls: metalk8s.addons.nginx-ingress-control-plane.deployed.chart-daemonset
