{%- set kubeconfig = "/etc/kubernetes/admin.conf" %}
{%- set context = "kubernetes-admin@kubernetes" %}

Expose Prometheus:
  metalk8s_kubernetes.service_present:
    - name: prometheus
    - namespace: metalk8s-monitoring
    - kubeconfig: {{ kubeconfig }}
    - context: {{ context }}
    - metadata:
        labels:
          app: prometheus
          app.kubernetes.io/managed-by: metalk8s
          app.kubernetes.io/name: prometheus
          app.kubernetes.io/part-of: metalk8s
          heritage: metalk8s
        name: prometheus
    - spec:
        ports:
        - name: web
          port: 9090
          protocol: TCP
          node_port: 30222
          targetPort: web
        selector:
          app: prometheus
          prometheus: prometheus-operator-prometheus
        type: NodePort
