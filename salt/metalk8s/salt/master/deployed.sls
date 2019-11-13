{% set kubeconfig = "/etc/kubernetes/admin.conf" %}
{% set context = "kubernetes-admin@kubernetes" %}


Install and start salt master service manifest:
  metalk8s_kubernetes.object_present:
    - manifest:
        apiVersion: v1
        kind: Service
        metadata:
          name: salt-master
          namespace: kube-system
          labels:
            app: salt-master
            app.kubernetes.io/name: salt-master
            app.kubernetes.io/component: salt
            heritage: metalk8s
            app.kubernetes.io/part-of: metalk8s
            app.kubernetes.io/managed-by: salt
        spec:
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
    - kubeconfig: {{ kubeconfig }}
    - context: {{ context }}
