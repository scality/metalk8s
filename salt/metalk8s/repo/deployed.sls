{%- from "metalk8s/map.jinja" import repo with context %}

{% set kubeconfig = "/etc/kubernetes/admin.conf" %}
{% set context = "kubernetes-admin@kubernetes" %}


Deploy repo service object:
  metalk8s_kubernetes.service_present:
    - name: repositories
    - kubeconfig: {{ kubeconfig }}
    - context: {{ context }}
    - namespace: kube-system
    - metadata:
        namespace: kube-system
        labels:
          app: repositories
          app.kubernetes.io/name: repositories
          heritage: metalk8s
          app.kubernetes.io/part-of: metalk8s
          app.kubernetes.io/managed-by: salt
    - spec:
        clusterIP: None
        ports:
        - name: http
          port: {{ repo.port }}
          protocol: TCP
          targetPort: http
        selector:
          app.kubernetes.io/name: repositories
        type: ClusterIP
