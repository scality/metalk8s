{% set kubeconfig = "/etc/kubernetes/admin.conf" %}
{% set context = "kubernetes-admin@kubernetes" %}
{%- set control_plane_ips = salt.saltutil.runner('mine.get', tgt='*', fun='control_plane_ips') %}
{%- if pillar['bootstrap_id'] in control_plane_ips.keys() and control_plane_ips[pillar['bootstrap_id']] %}
{%- set control_plane_ip = control_plane_ips[pillar['bootstrap_id']][0] %}
{%- else %}
{%- set control_plane_ip = 'localhost' %}
{%- endif %}

Create metalk8s-ui directories:
  file.directory:
    - user: root
    - group: root
    - mode: 755
    - makedirs: true
    - names:
      - /etc/metalk8s/ui

Create metalk8s-ui deployment:
  kubernetes.deployment_present:
    - name: metalk8s-ui
    - namespace: kube-system
    - kubeconfig: {{ kubeconfig }}
    - context: {{ context }}
    - source: salt://metalk8s/metalk8s-ui/files/metalk8s-ui_deployment.yaml
  require:
    - pkg: Install Python Kubernetes client

Create metalk8s-ui service:
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
        ports:
        - port: 80
          protocol: TCP
          targetPort: 80
        selector:
          k8s-app: ui
        type: NodePort
  require:
    - pkg: Install Python Kubernetes client

Create ui-api-configmap ConfigMap:
  kubernetes.configmap_present:
    - name: ui-api-configmap
    - namespace: kube-system
    - kubeconfig: {{ kubeconfig }}
    - context: {{ context }} 
    - data:
        config.json: |
          {"ip": "{{ control_plane_ip }}", port: "6443"}
  require:
    - pkg: Install Python Kubernetes client
    - file: Create metalk8s-ui directories
