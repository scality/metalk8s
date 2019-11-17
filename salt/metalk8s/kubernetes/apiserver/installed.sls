{%- from "metalk8s/repo/macro.sls" import build_image_name with context %}
{%- from "metalk8s/map.jinja" import networks with context %}

{%- set htpasswd_path = "/etc/kubernetes/htpasswd" %}
{%- set encryption_k8s_path = "/etc/kubernetes/encryption.conf" %}

{# This whole block is used to "know" the Ingress external IP used by Dex.
   It will be removed once we can have a known LoadBalancer IP for Ingress. #}
{% if '_errors' in pillar.metalk8s.nodes %}
  {# Assume this is the bootstrap Node and we haven't an apiserver yet #}
  {%- set bootstrap_id = grains.id %}
{%- elif pillar.metalk8s.nodes | length <= 1 %}
  {# Only one node (or even, zero) can/should only happen during bootstrap #}
  {%- set bootstrap_id = grains.id %}
{%- else %}
  {%- set bootstrap_id = none %}
  {%- for minion_id, node in pillar.metalk8s.nodes.items() %}
    {%- if 'bootstrap' in node.roles %}
      {%- set bootstrap_id = minion_id %}
      {%- break %}
    {%- endif %}
  {%- endfor %}
{%- endif %}

{%- if bootstrap_id is none %}
  {{ raise('Missing bootstrap Node in pillar, cannot proceed.') }}
{%- elif bootstrap_id == grains.id %}
  {%- set bootstrap_control_plane_ip = grains.metalk8s.control_plane_ip %}
{%- else %}
  {%- set bootstrap_control_plane_ip = salt['mine.get'](bootstrap_id,
                                                        'control_plane_ip') %}
{%- endif %}

{%- set ingress_control_plane = bootstrap_control_plane_ip ~ ':8443' %}
{# (end of Ingress URL retrieval) #}

include:
  - metalk8s.kubernetes.ca.advertised
  - metalk8s.kubernetes.sa.advertised
  - metalk8s.addons.nginx-ingress.ca.advertised
  - .certs

{%- if pillar.metalk8s.api_server.keepalived.enabled %}
Create keepalived check script:
  file.managed:
    - name: /etc/keepalived/check-apiserver.sh
    - mode: 0555
    - makedirs: true
    - dir_mode: 0755
    - contents: |
        #!/bin/bash
        set -ue -o pipefail
        test $(curl -k https://127.0.0.1:6443/healthz) = 'ok'

Create keepalived configuration file generator:
  file.managed:
    - name: /etc/keepalived/keepalived.conf.sh
    - mode: 0555
    - makedirs: true
    - dir_mode: 0755
    - contents: |
        #!/bin/bash
        set -xue -o pipefail

        IP=${IP:-ip}
        AWK=${AWK:-awk}

        INTERFACE=${INTERFACE:-$(${IP} route get ${INTERFACE_ADDRESS} | ${AWK} '/dev / { print $4 }')}

        cat > "$1" << EOF
        global_defs {
          enable_script_security
        }

        vrrp_script check_apiserver {
          script "/etc/keepalived/check-apiserver.sh"
          interval 2
          weight 2
        }

        vrrp_instance VI_1 {
          state ${VRRP_STATE:-BACKUP}
          virtual_router_id ${VRRP_VIRTUAL_ROUTER_ID:-1}
          interface ${INTERFACE}
          authentication {
            auth_type PASS
            auth_pass ${VRRP_PASSWORD}
          }
          virtual_ipaddress {
            ${VIP}
          }
          track_script {
            check_apiserver
          }
        }
        EOF
{%- endif %}

Set up default basic auth htpasswd:
  file.managed:
    - name: {{ htpasswd_path }}
    - source: salt://{{ slspath }}/files/htpasswd
    - user: root
    - group: root
    - mode: 600
    - makedirs: True
    - dir_mode: 750

{%- set host = grains['metalk8s']['control_plane_ip'] %}

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
        - /etc/metalk8s/pki/nginx-ingress/ca.crt
        - {{ htpasswd_path }}
{%- if pillar.metalk8s.api_server.keepalived.enabled %}
        - /etc/keepalived/check-apiserver.sh
        - /etc/keepalived/keepalived.conf.sh
{%- endif %}
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
          - --etcd-servers=https://{{ grains.metalk8s.control_plane_ip }}:2379
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
          - --oidc-issuer-url=https://{{ ingress_control_plane }}/oidc
          - --oidc-client-id=oidc-auth-client
          - --oidc-ca-file=/etc/metalk8s/pki/nginx-ingress/ca.crt
          - --oidc-username-claim=email
          - --oidc-groups-claim=groups
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
          - path: {{ htpasswd_path }}
            type: File
            name: htpasswd
{%- if pillar.metalk8s.api_server.keepalived.enabled %}
          - path: /etc/keepalived
            name: keepalived-config
{%- endif %}
        sidecars:
{%- if pillar.metalk8s.api_server.keepalived.enabled %}
          - name: keepalived
            image: {{ build_image_name("keepalived") }}
            args:
              - --dont-fork
              - --dump-conf
              - --address-monitoring
              - --log-console
              - --log-detail
              - --vrrp
            env:
              - name: INTERFACE_ADDRESS
                value: {{ networks.control_plane.split('/')[0] }}
              - name: VRRP_PASSWORD
                value: {{ pillar.metalk8s.api_server.keepalived.authPassword }}
              - name: VIP
                value: {{ pillar.metalk8s.api_server.host }}
            securityContext:
              readOnlyRootFilesystem: true
              allowPrivilegeEscalation: false
              capabilities:
                drop:
                  - ALL
                add:
                  - NET_ADMIN
                  - NET_BROADCAST
                  - NET_RAW
                  - SETGID
                  - SETUID
            resources:
              requests:
                cpu: 100m
                memory: 64Mi
            volumeMounts:
              - name: keepalived-config
                mountPath: /etc/keepalived
                readOnly: true
              - name: keepalived-varrun
                mountPath: /var/run
              - name: keepalived-tmp
                mountPath: /tmp
{%- endif %}
        extra_volumes:
{%- if pillar.metalk8s.api_server.keepalived.enabled %}
          - name: keepalived-varrun
            emptyDir:
              medium: Memory
          - name: keepalived-tmp
            emptyDir:
              medium: Memory
{%- endif %}
    - require:
      - file: Ensure kubernetes CA cert is present
      - file: Ensure etcd CA cert is present
      - file: Ensure front-proxy CA cert is present
      - file: Ensure SA pub key is present
      - file: Set up default basic auth htpasswd
      - file: Ensure Ingress CA cert is present
{%- if pillar.metalk8s.api_server.keepalived.enabled %}
      - file: Create keepalived check script
      - file: Create keepalived configuration file generator
{%- endif %}

Make sure kube-apiserver container is up:
  module.wait:
    - cri.wait_container:
      - name: kube-apiserver
      - state: running
    - watch:
      - metalk8s: Create kube-apiserver Pod manifest
