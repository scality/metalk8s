{%- from "metalk8s/repo/macro.sls" import build_image_name with context %}
{%- from "metalk8s/map.jinja" import certificates with context %}
{%- from "metalk8s/map.jinja" import metalk8s with context %}
{%- from "metalk8s/map.jinja" import networks with context %}
{%- from "metalk8s/addons/nginx-ingress-control-plane/control-plane-ip.sls"
    import ingress_control_plane with context
%}

{%- set encryption_k8s_path = "/etc/kubernetes/encryption.conf" %}

include:
  - metalk8s.kubernetes.ca.advertised
  - metalk8s.kubernetes.sa.advertised
  - metalk8s.addons.nginx-ingress.ca.advertised
  - .certs

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
        - {{ certificates.server.files.apiserver.path }}
        - /etc/kubernetes/pki/apiserver.key
        - {{ certificates.client.files['apiserver-etcd'].path }}
        - /etc/kubernetes/pki/apiserver-etcd-client.key
        - {{ certificates.client.files['apiserver-kubelet'].path }}
        - /etc/kubernetes/pki/apiserver-kubelet-client.key
        - /etc/kubernetes/pki/ca.crt
        - /etc/kubernetes/pki/etcd/ca.crt
        - /etc/kubernetes/pki/front-proxy-ca.crt
        - {{ certificates.client.files['front-proxy'].path }}
        - /etc/kubernetes/pki/front-proxy-client.key
        - /etc/kubernetes/pki/sa.pub
        - /etc/metalk8s/pki/nginx-ingress/ca.crt
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
          - --client-ca-file=/etc/kubernetes/pki/ca.crt
          - --cors-allowed-origins=.*
          - --enable-admission-plugins=NodeRestriction
          - --enable-bootstrap-token-auth=true
          - --encryption-provider-config={{ encryption_k8s_path }}
          - --etcd-cafile=/etc/kubernetes/pki/etcd/ca.crt
          - --etcd-certfile={{ certificates.client.files['apiserver-etcd'].path }}
          - --etcd-keyfile=/etc/kubernetes/pki/apiserver-etcd-client.key
          - --etcd-servers={{ etcd_servers | join(",") }}
          - --insecure-port=0
          - --kubelet-client-certificate={{ certificates.client.files['apiserver-kubelet'].path }}
          - --kubelet-client-key=/etc/kubernetes/pki/apiserver-kubelet-client.key
          - --kubelet-preferred-address-types=InternalIP,ExternalIP,Hostname
          - --proxy-client-cert-file={{ certificates.client.files['front-proxy'].path }}
          - --proxy-client-key-file=/etc/kubernetes/pki/front-proxy-client.key
          - --requestheader-allowed-names=front-proxy-client
          - --requestheader-client-ca-file=/etc/kubernetes/pki/front-proxy-ca.crt
          - --requestheader-extra-headers-prefix=X-Remote-Extra-
          - --requestheader-group-headers=X-Remote-Group
          - --requestheader-username-headers=X-Remote-User
          - --secure-port=6443
          - --service-account-key-file=/etc/kubernetes/pki/sa.pub
          - --service-cluster-ip-range={{ networks.service }}
          - --tls-cert-file={{ certificates.server.files.apiserver.path }}
          - --tls-private-key-file=/etc/kubernetes/pki/apiserver.key
          - --oidc-issuer-url=https://{{ ingress_control_plane }}/oidc
          - --oidc-client-id=oidc-auth-client
          - --oidc-ca-file=/etc/metalk8s/pki/nginx-ingress/ca.crt
          - --oidc-username-claim=email
          - '"--oidc-username-prefix=oidc:"'
          - --oidc-groups-claim=groups
          - '"--oidc-groups-prefix=oidc:"'
          - --v={{ 2 if metalk8s.debug else 0 }}
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
          - path: /etc/metalk8s/pki
            name: metalk8s-certs
          - path: /etc/ssl/certs
            name: ca-certs
    - require:
      - file: Ensure kubernetes CA cert is present
      - file: Ensure etcd CA cert is present
      - file: Ensure front-proxy CA cert is present
      - file: Ensure SA pub key is present
      - file: Ensure Ingress CA cert is present

Delay after apiserver pod deployment:
  module.run:
    - test.sleep:
      - length: 10
    - onchanges:
      - metalk8s: Create kube-apiserver Pod manifest

Make sure kube-apiserver container is up and ready:
  module.run:
    - cri.wait_container:
      - name: kube-apiserver
      - state: running
    - onchanges:
      - metalk8s: Create kube-apiserver Pod manifest
    - require:
      - module: Delay after apiserver pod deployment
  http.wait_for_successful_query:
    - name: https://127.0.0.1:6443/healthz
    - verify_ssl: True
    - ca_bundle: /etc/kubernetes/pki/ca.crt
    - status: 200
    - match: 'ok'
    - require:
      - module: Make sure kube-apiserver container is up and ready
