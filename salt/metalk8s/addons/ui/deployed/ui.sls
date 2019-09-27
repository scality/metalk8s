include:
- .namespace

{%- set kubeconfig = "/etc/kubernetes/admin.conf" %}
{%- set context = "kubernetes-admin@kubernetes" %}

Create metalk8s-ui deployment:
  metalk8s_kubernetes.deployment_present:
    - name: metalk8s-ui
    - namespace: metalk8s-ui
    - kubeconfig: {{ kubeconfig }}
    - context: {{ context }}
    - source: salt://{{ slspath }}/files/metalk8s-ui-deployment.yaml
    - template: jinja

Create metalk8s-ui service:
  metalk8s_kubernetes.service_present:
    - name: metalk8s-ui
    - namespace: metalk8s-ui
    - kubeconfig: {{ kubeconfig }}
    - context: {{ context }}
    - metadata:
        labels:
          run: metalk8s-ui
        name: metalk8s-ui
    - spec:
        ports:
        - port: 80
          protocol: TCP
          targetPort: 80
        selector:
          app: metalk8s-ui
        type: ClusterIP

Create metalk8s-ui ConfigMap:
  metalk8s_kubernetes.configmap_present:
    - name: metalk8s-ui
    - namespace: metalk8s-ui
    - kubeconfig: {{ kubeconfig }}
    - context: {{ context }}
    - data:
        config.json: |
          {
            "url": "/api/kubernetes",
            "url_salt": "/api/salt",
            "url_prometheus": "/api/prometheus"
          }

Create ui-branding ConfigMap:
  metalk8s_kubernetes.configmap_present:
    - name: ui-branding
    - namespace: metalk8s-ui
    - kubeconfig: {{ kubeconfig }}
    - context: {{ context }}
    - data:
        theme.json: |
          {"brand": {"primary": "#403e40", "secondary": "#e99121"}}
