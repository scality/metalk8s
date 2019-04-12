{% from "metalk8s/registry/macro.sls" import build_image_name with context %}

{% set image_name = build_image_name('etcd', '3.2.24') %}

{% set host_name = salt.network.get_hostname() %}
{% set host = grains['metalk8s']['control_plane_ip'] %}

{% set endpoint  = host_name ~ '=https://' ~ host ~ ':2380' %}

{%- set ca_cert = salt['mine.get'](pillar['metalk8s']['ca']['minion'], 'kubernetes_etcd_ca_b64')[pillar['metalk8s']['ca']['minion']] %}
{%- set ca_cert_b64 = salt['hashutil.base64_b64decode'](ca_cert) %}

{#- Get the list of existing etcd node. #}
{%- set etcd_endpoints = salt['mine.get']('*', 'etcd_endpoints').values() %}

{#- Compute the initial state according to the existing list of node. #}
{%- set state = "existing" if etcd_endpoints else "new" -%}

{#- Add ourselves to the list #}
{%- do etcd_endpoints.append(endpoint) %}

Create etcd database directory:
  file.directory:
    - name: /var/lib/etcd
    - dir_mode: 750
    - user: root
    - group: root
    - makedirs: True

Ensure etcd CA certificate is present:
  file.managed:
    - name: /etc/kubernetes/pki/etcd/ca.crt
    - user: root
    - group : root
    - mode: 644
    - makedirs: True
    - dir_mode: 755
    - contents: {{ ca_cert_b64.split('\n') }}

Create local etcd Pod manifest:
  file.managed:
    - name: /etc/kubernetes/manifests/etcd.yaml
    - source: salt://metalk8s/kubeadm/init/etcd/files/manifest.yaml
    - template: jinja
    - user: root
    - group: root
    - mode: 644
    - makedirs: True
    - dir_mode: 750
    - context:
        name: etcd
        image_name: {{ image_name }}
        command:
          - etcd
          - --advertise-client-urls=https://{{ host }}:2379
          - --cert-file=/etc/kubernetes/pki/etcd/server.crt
          - --client-cert-auth=true
          - --data-dir=/var/lib/etcd
          - --initial-advertise-peer-urls=https://{{ host }}:2380
          - --initial-cluster={{ etcd_endpoints|unique|join(',') }}
          - --initial-cluster-state={{ state }}
          - --key-file=/etc/kubernetes/pki/etcd/server.key
          - --listen-client-urls=https://127.0.0.1:2379,https://{{ host }}:2379
          - --listen-peer-urls=https://{{ host }}:2380
          - --name={{ host_name }}
          - --peer-cert-file=/etc/kubernetes/pki/etcd/peer.crt
          - --peer-client-cert-auth=true
          - --peer-key-file=/etc/kubernetes/pki/etcd/peer.key
          - --peer-trusted-ca-file=/etc/kubernetes/pki/etcd/ca.crt
          - --snapshot-count=10000
          - --trusted-ca-file=/etc/kubernetes/pki/etcd/ca.crt
        volumes:
          - path: /var/lib/etcd
            name: etcd-data
          - path: /etc/kubernetes/pki/etcd
            name: etcd-certs
            readOnly: true
    - require:
      - file: Create etcd database directory
      - file: Ensure etcd CA certificate is present

Advertise etcd node in the mine:
  module.run:
    - mine.send:
      - func: 'etcd_endpoints'
      - mine_function: metalk8s.get_etcd_endpoint
    - watch:
      - file: Create local etcd Pod manifest
