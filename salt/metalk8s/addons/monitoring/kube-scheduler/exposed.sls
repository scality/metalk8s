{%- set kubeconfig = "/etc/kubernetes/admin.conf" %}
{%- set context = "kubernetes-admin@kubernetes" %}

Expose Kubernetes Scheduler to Prometheus:
  metalk8s_kubernetes.service_present:
    - name: kube-scheduler-prometheus-discovery
    - namespace: kube-system
    - kubeconfig: {{ kubeconfig }}
    - context: {{ context }}
    - metadata:
        labels:
          k8s-app: kube-scheduler
    - spec:
        ports:
        - name: http-metrics
          port: 10251
          protocol: TCP
          targetPort: http-metrics
        selector:
          component: kube-scheduler
        type: ClusterIP
        clusterIP: None
  require:
    - metalk8s_package_manager: Install Python Kubernetes client
