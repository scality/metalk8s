{% set kubeconfig = "/etc/kubernetes/admin.conf" %}
{% set context = "kubernetes-admin@kubernetes" %}


Deploy registry service object:
  metalk8s_kubernetes.service_present:
    - name: registry
    - kubeconfig: {{ kubeconfig }}
    - context: {{ context }}
    - namespace: kube-system
    - metadata:
        namespace: kube-system
        labels:
          app: registry
          app.kubernetes.io/name: registry
          app.kubernetes.io/component: registry
          heritage: metalk8s
          app.kubernetes.io/part-of: metalk8s
          app.kubernetes.io/managed-by: salt
    - spec:
        clusterIP: None
        ports:
        - name: registry
          port: 5000
          protocol: TCP
          targetPort: registry
        selector:
          app.kubernetes.io/component: registry
          app.kubernetes.io/name: registry
        type: ClusterIP
