{%- from "metalk8s/repo/macro.sls" import kubernetes_image, build_image_name with context %}
{%- from "metalk8s/map.jinja" import networks with context %}

{%- set htpasswd_path = "/etc/kubernetes/htpasswd" %}

{%- set keepalived_image = "keepalived" %}
{%- set keepalived_version = "1.3.5-8.el7_6-1" %}

include:
  - metalk8s.kubernetes.ca.advertised
  - metalk8s.kubernetes.sa.advertised
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
{%- if pillar.metalk8s.api_server.keepalived.enabled %}
        - /etc/keepalived/check-apiserver.sh
        - /etc/keepalived/keepalived.conf.sh
{%- endif %}
    - context:
        name: kube-apiserver
        host: {{ host }}
        image_name: {{ kubernetes_image("kube-apiserver") }}
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
        requested_cpu: 250m
        volumes:
          - path: /etc/pki
            name: etc-pki
          - path: /etc/kubernetes/pki
            name: k8s-certs
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
            image: {{ build_image_name(keepalived_image, keepalived_version) }}
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
    - onchanges:
      - file: Ensure kubernetes CA cert is present
      - file: Ensure etcd CA cert is present
      - file: Ensure front-proxy CA cert is present
      - file: Ensure SA pub key is present
      - file: Set up default basic auth htpasswd
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
