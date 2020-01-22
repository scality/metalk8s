{%- from "metalk8s/map.jinja" import kube_api with context %}
{%- from "metalk8s/map.jinja" import kubernetes with context %}

include:
  - metalk8s.internal.m2crypto

{%- if pillar.get('apiserver_ip') %}
{%-     set apiserver_ip = pillar.apiserver_ip %}
{%- else %}
{%-     set apiserver_ip = grains['metalk8s']['control_plane_ip'] %}
{%- endif %}

{%- set apiserver = 'https://' ~ apiserver_ip ~ ':6443' %}

Create kubeconfig file for admin:
  metalk8s_kubeconfig.managed:
    - name: /etc/kubernetes/admin.conf
    - ca_server: {{ pillar['metalk8s']['ca']['minion'] }}
    - signing_policy: {{ kube_api.cert.client_signing_policy }}
    - client_cert_info:
        CN: "kubernetes-admin"
        O: "system:masters"
    - apiserver: {{ apiserver }}
    - cluster: {{ kubernetes.cluster }}
    - require:
      - metalk8s_package_manager: Install m2crypto
