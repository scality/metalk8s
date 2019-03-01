{%- from "metalk8s/map.jinja" import coredns with context %}

{% set kubeconfig = "/etc/kubernetes/admin.conf" %}
{% set context = "kubernetes-admin@kubernetes" %}

Create coredns ConfigMap:
  kubernetes.configmap_present:
    - name: coredns
    - namespace: kube-system
    - kubeconfig: {{ kubeconfig }}
    - context: {{ context }} 
    - data:
        Corefile: |
          .:53 {
              errors
              health
              kubernetes {{ coredns.cluster_domain }} {{ coredns.reverse_cidrs }} {
                pods insecure
                upstream
                fallthrough in-addr.arpa ip6.arpa
              }
              prometheus :9153
              proxy . /etc/resolv.conf
              cache 30
              loop
              reload
              loadbalance
          }
  require:
    - pkg: Install Python Kubernetes client

Create coredns deployment:
  kubernetes.deployment_present:
    - name: coredns
    - namespace: kube-system
    - kubeconfig: {{ kubeconfig }}
    - context: {{ context }}
    - source: salt://metalk8s/kubeadm/init/addon/coredns/configs/deployment.yaml
  require:
    - kubernetes: Create coredns ConfigMap
    - pkg: Install Python Kubernetes client

Create coredns service:
  kubernetes.service_present:
    - name: coredns
    - namespace: kube-system
    - kubeconfig: {{ kubeconfig }}
    - context: {{ context }}
    - metadata:
        name: kube-dns
        namespace: kube-system
        annotations:
          prometheus.io/port: "9153"
          prometheus.io/scrape: "true"
        labels:
          k8s-app: kube-dns
          kubernetes.io/cluster-service: "true"
          kubernetes.io/name: "CoreDNS"
    - spec:
        selector:
          k8s-app: kube-dns
        clusterIP: {{ coredns.cluster_dns_ip }}
        ports:
        - name: dns
          port: 53
          protocol: UDP
        - name: dns-tcp
          port: 53
          protocol: TCP
        - name: metrics
          port: 9153
          protocol: TCP
  require:
    - kubernetes: Create coredns deployment
    - pkg: Install Python Kubernetes client

Create coredns service account:
  kubernetes.serviceaccount_present:
    - name: coredns
    - namespace: kube-system
    - kubeconfig: {{ kubeconfig }}
    - context: {{ context }}
    - require:
        - pkg: Install Python Kubernetes client

Create coredns cluster role:
  kubernetes.clusterrole_present:
    - name: system:coredns
    - kubeconfig: {{ kubeconfig }}
    - context: {{ context }}
    - rules:
      - apiGroups:
        - ""
        resources:
        - endpoints
        - services
        - pods
        - namespaces
        verbs:
        - list
        - watch
      - apiGroups:
        - ""
        resources:
        - nodes
        verbs:
        - get
  require:
    - pkg: Install Python Kubernetes client

Create coredns cluster role binding:
  kubernetes.clusterrolebinding_present:
    - name: system:coredns
    - kubeconfig: {{ kubeconfig }}
    - context: {{ context }}
    - role_ref:
        apiGroup: rbac.authorization.k8s.io
        kind: ClusterRole
        name: system:coredns
    - subjects:
      - kind: ServiceAccount
        name: coredns
        namespace: kube-system
  require:
    - pkg: Install Python Kubernetes client

