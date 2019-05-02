{% set kubeconfig = "/etc/kubernetes/admin.conf" %}
{% set context = "kubernetes-admin@kubernetes" %}


Deploy repo service object:
  metalk8s_kubernetes.service_present:
    - name: package-repositories
    - kubeconfig: {{ kubeconfig }}
    - context: {{ context }}
    - namespace: kube-system
    - metadata:
        namespace: kube-system
        labels:
          app: package-repositories
          app.kubernetes.io/name: package-repositories
          heritage: metalk8s
          app.kubernetes.io/part-of: metalk8s
          app.kubernetes.io/managed-by: salt
    - spec:
        clusterIP: None
        ports:
        - name: http
          port: {{ pillar.metalk8s.endpoints['package-repositories'].ports.http }}
          protocol: TCP
          targetPort: http
        selector:
          app.kubernetes.io/name: package-repositories
        type: ClusterIP
