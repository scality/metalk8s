{%- from "metalk8s/map.jinja" import coredns with context %}

{% set kubeconfig = "/etc/kubernetes/admin.conf" %}
{% set context = "kubernetes-admin@kubernetes" %}

include:
  - ..installed
  - metalk8s.salt.minion.running

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
    - pkg: Install python2-kubernetes

Create coredns deployment:
  kubernetes.deployment_present:
    - name: coredns
    - namespace: kube-system
    - kubeconfig: {{ kubeconfig }}
    - context: {{ context }}
    - source: salt://metalk8s/kubeadm/init/addon/coredns/configs/deployment.yaml
  require:
    - kubernetes: Create coredns ConfigMap

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

{%- else %}

Unable to get admin kubeconf data:
  test.fail_without_changes: []

{%- endif %}
