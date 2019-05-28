{%- set kubeconfig = "/etc/kubernetes/admin.conf" %}
{%- set context = "kubernetes-admin@kubernetes" %}

{%- set apiserver = 'https://' ~ pillar.metalk8s.api_server.host ~ ':6443' %}
{%- set saltapi = 'http://' ~ pillar.metalk8s.endpoints['salt-master'].ip ~ ':' ~ pillar.metalk8s.endpoints['salt-master'].ports.api %}

Create metalk8s-ui deployment:
  metalk8s_kubernetes.deployment_present:
    - name: metalk8s-ui
    - namespace: kube-system
    - kubeconfig: {{ kubeconfig }}
    - context: {{ context }}
    - source: salt://{{ slspath }}/files/metalk8s-ui-deployment.yaml
    - template: jinja
  require:
    - pkg: Install Python Kubernetes client

Create metalk8s-ui service:
  metalk8s_kubernetes.service_present:
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
        type: ClusterIP
  require:
    - pkg: Install Python Kubernetes client

Create metalk8s-ui Ingress:
  metalk8s_kubernetes.ingress_present:
    - name: metalk8s-ui
    - namespace: kube-system
    - kubeconfig: {{ kubeconfig }}
    - context: {{ context }}
    - metadata:
        name: metalk8s-ui
        labels:
          k8s-app: ui
        annotations:
          kubernetes.io/ingress.class: nginx
          nginx.ingress.kubernetes.io/rewrite-target: /
    - spec:
        rules:
          - host: metalk8s
            http:
              paths:
                - path: /
                  backend:
                    serviceName: metalk8s-ui
                    servicePort: 80

  require:
    - pkg: Install Python Kubernetes client
    - metalk8s_kubernetes: Create metalk8s-ui service

Create metalk8s-ui ConfigMap:
  metalk8s_kubernetes.configmap_present:
    - name: metalk8s-ui
    - namespace: kube-system
    - kubeconfig: {{ kubeconfig }}
    - context: {{ context }}
    - data:
        config.json: |
          {
            "url": "{{ apiserver }}",
            "url_salt": "{{ saltapi }}"
          }
        theme.json: |
          {"brand": {"primary": "#21157A"}}
  require:
    - pkg: Install Python Kubernetes client
