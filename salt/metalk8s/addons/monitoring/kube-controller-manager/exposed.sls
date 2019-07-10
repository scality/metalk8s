{%- set kubeconfig = "/etc/kubernetes/admin.conf" %}
{%- set context = "kubernetes-admin@kubernetes" %}

Expose Kubernetes Controller Manager to Prometheus:
  metalk8s_kubernetes.service_present:
    - name: kube-controller-manager-prometheus-discovery
    - namespace: kube-system
    - kubeconfig: {{ kubeconfig }}
    - context: {{ context }}
    - metadata:
        labels:
          k8s-app: kube-controller-manager
    - spec:
        ports:
        - name: http-metrics
          port: 10252
          protocol: TCP
          targetPort: http-metrics
        selector:
          component: kube-controller-manager
        type: ClusterIP
        clusterIP: None
  require:
    - metalk8s_package_manager: Install Python Kubernetes client
