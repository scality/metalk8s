{% set kubeconfig = "/etc/kubernetes/admin.conf" %}
{% set context = "kubernetes-admin@kubernetes" %}


Install and start salt master service manifest:
  metalk8s_kubernetes.service_present:
    - name: salt-master
    - kubeconfig: {{ kubeconfig }}
    - context: {{ context }}
    - namespace: kube-system
    - metadata:
        namespace: kube-system
        labels:
          app: salt-master
          app.kubernetes.io/name: salt-master
          app.kubernetes.io/component: salt
          heritage: metalk8s
          app.kubernetes.io/part-of: metalk8s
          app.kubernetes.io/managed-by: salt
    - spec:
        clusterIP: None
        ports:
        - name: publisher
          port: 4505
          protocol: TCP
          targetPort: publisher
        - name: requestserver
          port: 4506
          protocol: TCP
          targetPort: requestserver
        - name: api
          port: 4507
          protocol: TCP
          targetPort: api
        selector:
          app.kubernetes.io/component: salt
          app.kubernetes.io/name: salt-master
        type: ClusterIP
