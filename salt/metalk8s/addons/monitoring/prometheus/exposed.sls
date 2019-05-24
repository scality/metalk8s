{%- set kubeconfig = "/etc/kubernetes/admin.conf" %}
{%- set context = "kubernetes-admin@kubernetes" %}

Expose Prometheus:
  metalk8s_kubernetes.service_present:
    - name: prometheus
    - namespace: monitoring
    - kubeconfig: {{ kubeconfig }}
    - context: {{ context }}
    - metadata:
        labels:
          run: prometheus
          prometheus: k8s
        name: prometheus
    - spec:
        ports:
        - name: api
          port: 9090
          protocol: TCP
          node_port: 30222
          targetPort: api
        selector:
          app: prometheus
          prometheus: k8s
        type: NodePort
  require:
    - pkg: Install Python Kubernetes client
