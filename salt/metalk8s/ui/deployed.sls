{% set kubeconfig = "/etc/kubernetes/admin.conf" %}
{% set context = "kubernetes-admin@kubernetes" %}

{%- if pillar['bootstrap_id'] %}
{%-   set control_plane_ips = salt.saltutil.runner('mine.get', tgt=pillar['bootstrap_id'], fun='control_plane_ip') %}
{%- else %}
{%-   set control_plane_ips = {} %}
{%- endif %}

{%- if pillar['bootstrap_id'] in control_plane_ips.keys() and control_plane_ips[pillar['bootstrap_id']] %}
{%-   set control_plane_ip = control_plane_ips[pillar['bootstrap_id']] %}
{%- endif %}


Create metalk8s-ui deployment:
  kubernetes.deployment_present:
    - name: metalk8s-ui
    - namespace: kube-system
    - kubeconfig: {{ kubeconfig }}
    - context: {{ context }}
    - source: salt://metalk8s/ui/files/metalk8s-ui_deployment.yaml
    - template: jinja
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

Create metalk8s-ui ConfigMap:
  kubernetes.configmap_present:
    - name: metalk8s-ui
    - namespace: kube-system
    - kubeconfig: {{ kubeconfig }}
    - context: {{ context }} 
    - data:
        config.json: |
          {"url": "https://{{ control_plane_ip }}:6443"}
        theme.json: |
          {"brand": {"primary": "#21157A"}}
  require:
    - pkg: Install Python Kubernetes client
