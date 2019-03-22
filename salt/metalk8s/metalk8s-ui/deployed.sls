{% set salt_master_image = 'salt-master' %}
{% set salt_master_version = '2018.3.3-1' %}
{% set registry_prefix = 'localhost:5000/metalk8s-2.0/' %}
{% set version = '2.0' %}

{% set kubeconfig = "/etc/kubernetes/admin.conf" %}
{% set context = "kubernetes-admin@kubernetes" %}

Create metalk8s-ui deployment:
  kubernetes.deployment_present:
    - name: metalk8s-ui
    - namespace: kube-system
    - kubeconfig: {{ kubeconfig }}
    - context: {{ context }}
    - source: salt://metalk8s/metalk8s-ui/files/metalk8s-ui_deployment.yaml
  require:
    - pkg: Install Python Kubernetes client

Create coredns service:
  kubernetes.service_present:
    - name: metalk8s-ui
    - namespace: kube-system
    - kubeconfig: {{ kubeconfig }}
    - context: {{ context }}
    - metadata:
        labels:
          run: metalk8s-ui
        name: metalk8s-ui
    - spec:
        externalTrafficPolicy: Cluster
        ports:
        - port: 80
          protocol: TCP
          targetPort: 80
        selector:
          k8s-app: ui
        sessionAffinity: None
        type: NodePort
  require:
    - kubernetes: Create metalk8s-ui deployment
    - pkg: Install Python Kubernetes client
