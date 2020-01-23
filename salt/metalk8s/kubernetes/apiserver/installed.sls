{%- from "metalk8s/repo/macro.sls" import build_image_name with context %}
{%- from "metalk8s/map.jinja" import networks with context %}

{%- set htpasswd_path = "/etc/kubernetes/htpasswd" %}
{%- set encryption_k8s_path = "/etc/kubernetes/encryption.conf" %}

include:
  - metalk8s.kubernetes.ca.advertised
  - metalk8s.kubernetes.sa.advertised
  - .certs

Set up default basic auth htpasswd:
  file.managed:
    - name: {{ htpasswd_path }}
    - source: salt://{{ slspath }}/files/htpasswd
    - user: root
    - group: root
    - mode: 600
    - makedirs: True
    - dir_mode: 750
    - replace: False

{%- set host = grains['metalk8s']['control_plane_ip'] %}
{%- set etcd_servers = [] %}
{#- NOTE: Filter out members with empty name as they are not started yet. #}
{%- for member in pillar.metalk8s.etcd.members | selectattr('name') %}
{%-   do etcd_servers.extend(member['client_urls']) %}
{%- endfor %}
{%- set etcd_servers = etcd_servers | sort %}
{%- if 'etcd' in pillar.metalk8s.nodes[grains.id].roles %}
{%-   do etcd_servers.insert(0, "https://" ~ host ~ ":2379") %}
{%- endif %}
{%- set etcd_servers = etcd_servers | unique %}

Create kube-apiserver Pod manifest:
  metalk8s.static_pod_managed:
    - name: /etc/kubernetes/manifests/kube-apiserver.yaml
    - source: salt://metalk8s/kubernetes/files/control-plane-manifest.yaml
    - config_files:
        - {{ encryption_k8s_path }}
        - /etc/kubernetes/pki/apiserver.crt
        - /etc/kubernetes/pki/apiserver.key
        - /etc/kubernetes/pki/apiserver-etcd-client.crt
        - /etc/kubernetes/pki/apiserver-etcd-client.key
        - /etc/kubernetes/pki/apiserver-kubelet-client.crt
        - /etc/kubernetes/pki/apiserver-kubelet-client.key
        - /etc/kubernetes/pki/ca.crt
        - /etc/kubernetes/pki/etcd/ca.crt
        - /etc/kubernetes/pki/front-proxy-ca.crt
        - /etc/kubernetes/pki/front-proxy-client.crt
        - /etc/kubernetes/pki/front-proxy-client.key
        - /etc/kubernetes/pki/sa.pub
        - {{ htpasswd_path }}
    - context:
        name: kube-apiserver
        host: {{ host }}
        image_name: {{ build_image_name("kube-apiserver") }}
        port: 6443
        scheme: HTTPS
        command:
          - kube-apiserver
          - --authorization-mode=Node,RBAC
          - --advertise-address={{ host }}
          - --allow-privileged=true
          - --basic-auth-file={{ htpasswd_path }}
          - --client-ca-file=/etc/kubernetes/pki/ca.crt
          - --cors-allowed-origins=.*
          - --enable-admission-plugins=NodeRestriction
          - --enable-bootstrap-token-auth=true
          - --encryption-provider-config={{ encryption_k8s_path }}
          - --etcd-cafile=/etc/kubernetes/pki/etcd/ca.crt
          - --etcd-certfile=/etc/kubernetes/pki/apiserver-etcd-client.crt
          - --etcd-keyfile=/etc/kubernetes/pki/apiserver-etcd-client.key
          - --etcd-servers={{ etcd_servers | join(",") }}
          - --insecure-port=0
          - --kubelet-client-certificate=/etc/kubernetes/pki/apiserver-kubelet-client.crt
          - --kubelet-client-key=/etc/kubernetes/pki/apiserver-kubelet-client.key
          - --kubelet-preferred-address-types=InternalIP,ExternalIP,Hostname
          - --proxy-client-cert-file=/etc/kubernetes/pki/front-proxy-client.crt
          - --proxy-client-key-file=/etc/kubernetes/pki/front-proxy-client.key
          - --requestheader-allowed-names=front-proxy-client
          - --requestheader-client-ca-file=/etc/kubernetes/pki/front-proxy-ca.crt
          - --requestheader-extra-headers-prefix=X-Remote-Extra-
          - --requestheader-group-headers=X-Remote-Group
          - --requestheader-username-headers=X-Remote-User
          - --secure-port=6443
          - --service-account-key-file=/etc/kubernetes/pki/sa.pub
          - --service-cluster-ip-range={{ networks.service }}
          - --tls-cert-file=/etc/kubernetes/pki/apiserver.crt
          - --tls-private-key-file=/etc/kubernetes/pki/apiserver.key
        requested_cpu: 250m
        volumes:
          - path: {{ encryption_k8s_path }}
            type: File
            name: k8s-encryption
          {%- if grains['os_family'] == 'RedHat' %}
          - path: /etc/pki
            name: etc-pki
          {%- endif %}
          - path: /etc/kubernetes/pki
            name: k8s-certs
          - path: /etc/ssl/certs
            name: ca-certs
          - path: {{ htpasswd_path }}
            type: File
            name: htpasswd
    - require:
      - file: Ensure kubernetes CA cert is present
      - file: Ensure etcd CA cert is present
      - file: Ensure front-proxy CA cert is present
      - file: Ensure SA pub key is present
      - file: Set up default basic auth htpasswd

Make sure kube-apiserver container is up:
  module.wait:
    - cri.wait_container:
      - name: kube-apiserver
      - state: running
    - watch:
      - metalk8s: Create kube-apiserver Pod manifest
