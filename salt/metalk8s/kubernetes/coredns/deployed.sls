{%- from "metalk8s/map.jinja" import coredns with context %}
{%- from "metalk8s/map.jinja" import metalk8s with context %}

{%- set cluster_dns_ip = salt.metalk8s_network.get_cluster_dns_ip() %}

Create coredns ConfigMap:
  metalk8s_kubernetes.object_present:
    - manifest:
        apiVersion: v1
        kind: ConfigMap
        metadata:
          name: coredns
          namespace: kube-system
        data:
          Corefile: |
            .:53 {
                errors
                health {
                  lameduck 5s
                }
                ready
                kubernetes {{ coredns.cluster_domain }} {{ coredns.reverse_cidrs }} {
                  pods insecure
                  fallthrough in-addr.arpa ip6.arpa
                  ttl 30
                }
                prometheus :9153
                forward . /etc/resolv.conf
                cache 30
                loop
                reload
                loadbalance
                {%- if metalk8s.debug %}
                log
                {%- endif %}
            }

Create coredns deployment:
  metalk8s_kubernetes.object_present:
    - name: salt://{{ slspath }}/files/coredns-deployment.yaml.j2
    - template: jinja
    - require:
      - metalk8s_kubernetes: Create coredns ConfigMap

Create coredns service:
  metalk8s_kubernetes.object_present:
    - manifest:
        apiVersion: v1
        kind: Service
        metadata:
          name: coredns
          namespace: kube-system
          annotations:
            prometheus.io/port: "9153"
            prometheus.io/scrape: "true"
          labels:
            k8s-app: kube-dns
            kubernetes.io/cluster-service: "true"
            app.kubernetes.io/name: "CoreDNS"
        spec:
          selector:
            k8s-app: kube-dns
          clusterIP: {{ cluster_dns_ip }}
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
    - require:
      - metalk8s_kubernetes: Create coredns deployment

Create coredns service account:
  metalk8s_kubernetes.object_present:
    - manifest:
        apiVersion: v1
        kind: ServiceAccount
        metadata:
          name: coredns
          namespace: kube-system

Create coredns cluster role:
  metalk8s_kubernetes.object_present:
    - manifest:
        apiVersion: rbac.authorization.k8s.io/v1
        kind: ClusterRole
        metadata:
          name: system:coredns
        rules:
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

Create coredns cluster role binding:
  metalk8s_kubernetes.object_present:
    - manifest:
        apiVersion: rbac.authorization.k8s.io/v1
        kind: ClusterRoleBinding
        metadata:
          name: system:coredns
        roleRef:
          apiGroup: rbac.authorization.k8s.io
          kind: ClusterRole
          name: system:coredns
        subjects:
        - kind: ServiceAccount
          name: coredns
          namespace: kube-system
