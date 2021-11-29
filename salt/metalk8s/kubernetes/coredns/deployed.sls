{%- from "metalk8s/map.jinja" import coredns with context %}
{%- from "metalk8s/map.jinja" import metalk8s with context %}

{%- set cluster_dns_ip = salt.metalk8s_network.get_cluster_dns_ip() %}

{%- set pillar_coredns = pillar.kubernetes.get("coreDNS", {}) %}

{%- set replicas = pillar_coredns.get("replicas") or 2 %}
{%- set label_selector = {"k8s-app": "kube-dns"} %}

{%- set pillar_affinities = pillar_coredns.get("affinity", {}) %}
{#- NOTE: The default podAntiAffinity is a soft anti-affinity on hostname #}
{%- do pillar_affinities.setdefault("podAntiAffinity", {}).setdefault(
    "soft", [{"topologyKey": "kubernetes.io/hostname"}]
) %}

{%- set affinity = salt.metalk8s_service_configuration.get_pod_affinity(
    pillar_affinities,
    label_selector,
    "kube-system"
) %}

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
                forward . /etc/resolv.conf {
                  max_concurrent 1000
                }
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
    - defaults:
        replicas: {{ replicas }}
        label_selector: {{ label_selector | tojson }}
        affinity: {{ affinity | tojson }}

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
            targetPort: 53
          - name: dns-tcp
            port: 53
            protocol: TCP
            targetPort: 53
          - name: metrics
            port: 9153
            protocol: TCP
            targetPort: 9153
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
        - apiGroups:
          - discovery.k8s.io
          resources:
          - endpointslices
          verbs:
          - list
          - watch

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
