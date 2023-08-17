include:
  - .namespace
  - .tls-secret
  - .chart
  - metalk8s.addons.prometheus-operator.deployed.namespace
  - .dashboards
  - .service-configuration
  - .config-map

{#- In MetalK8s 126.0 we remove the default backend for the workloadplane,
    let's remove old objects #}
{#- This logic can be removed in `development/127.0` #}

Delete old service for the default backend:
  metalk8s_kubernetes.object_absent:
    - apiVersion: v1
    - kind: Service
    - name: ingress-nginx-defaultbackend
    - namespace: metalk8s-ingress
    - require:
      - sls: metalk8s.addons.nginx-ingress.deployed.chart

Delete old deployment for the default backend:
  metalk8s_kubernetes.object_absent:
    - apiVersion: apps/v1
    - kind: Deployment
    - name: ingress-nginx-defaultbackend
    - namespace: metalk8s-ingress
    - require:
      - sls: metalk8s.addons.nginx-ingress.deployed.chart

Delete old serviceaccount for the default backend:
  metalk8s_kubernetes.object_absent:
    - apiVersion: v1
    - kind: ServiceAccount
    - name: ingress-nginx-backend
    - namespace: metalk8s-ingress
    - require:
      - sls: metalk8s.addons.nginx-ingress.deployed.chart
