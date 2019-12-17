# creates the manifest YAML and wait for the member to be up and running
{%- from "metalk8s/repo/macro.sls" import build_image_name with context %}

include:
  - .prepared
  - metalk8s.kubernetes.ca.etcd.advertised
  - metalk8s.kubernetes.etcd.certs

{%- set node_name = grains['id'] %}
{%- set node_ip = grains['metalk8s']['control_plane_ip'] %}

{%- set endpoint = 'https://' ~ node_ip ~ ':2380' %}

{#- Get the list of existing etcd member. #}
{%- set etcd_members = pillar.metalk8s.etcd.members %}

{#- Compute the initial state according to the existing list of node. #}
{%- set state = "existing" if etcd_members else "new" %}

{%- set etcd_endpoints = {} %}
{#- NOTE: Filter out members with empty name as they are not started yet. #}
{%- for member in etcd_members | selectattr('name') %}
  {#- NOTE: Only take first peer_urls for endpoint. #}
  {%- do etcd_endpoints.update({member['name']: member['peer_urls'][0]}) %}
{%- endfor %}

{#- Add ourselves to the endpoints. #}
{%- do etcd_endpoints.update({node_name: endpoint}) %}

{%- set etcd_initial_cluster = [] %}
{%- for name, ep in etcd_endpoints.items() %}
  {%- do etcd_initial_cluster.append(name ~ '=' ~ ep) %}
{%- endfor %}

Create local etcd Pod manifest:
  metalk8s.static_pod_managed:
    - name: /etc/kubernetes/manifests/etcd.yaml
    - source: salt://{{ slspath }}/files/manifest.yaml
    - config_files:
        - /etc/kubernetes/pki/etcd/ca.crt
        - /etc/kubernetes/pki/etcd/peer.crt
        - /etc/kubernetes/pki/etcd/peer.key
        - /etc/kubernetes/pki/etcd/server.crt
        - /etc/kubernetes/pki/etcd/server.key
    - context:
        name: etcd
        image_name: {{ build_image_name('etcd') }}
        command:
          - etcd
          - --advertise-client-urls=https://{{ node_ip }}:2379
          - --cert-file=/etc/kubernetes/pki/etcd/server.crt
          - --client-cert-auth=true
          - --data-dir=/var/lib/etcd
          - --initial-advertise-peer-urls=https://{{ node_ip }}:2380
          - --initial-cluster={{ etcd_initial_cluster| sort | join(',') }}
          - --initial-cluster-state={{ state }}
          - --key-file=/etc/kubernetes/pki/etcd/server.key
          - --listen-client-urls=https://127.0.0.1:2379,https://{{ node_ip }}:2379
          - --listen-peer-urls=https://{{ node_ip }}:2380
          - --listen-metrics-urls=http://127.0.0.1:2381,http://{{ node_ip }}:2381
          - --name={{ node_name }}
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
      - file: Ensure etcd CA cert is present

# wait until etcd is actually up and running
Delay after etcd pod deployment:
  module.wait:
    - test.sleep:
      - length: 10
    - watch:
      - metalk8s: Create local etcd Pod manifest

Waiting for etcd running:
  http.wait_for_successful_query:
    - name: https://127.0.0.1:2379/health
    - verify_ssl: True
    - ca_bundle: /etc/kubernetes/pki/etcd/ca.crt
    - cert:
      - /etc/kubernetes/pki/etcd/server.crt
      - /etc/kubernetes/pki/etcd/server.key
    - status: 200
    - match: '{"health":"true"}'
    - require:
      - module: Delay after etcd pod deployment
