{%- from "metalk8s/map.jinja" import certificates with context %}
{%- from "metalk8s/repo/macro.sls" import build_image_name with context %}

include:
  - metalk8s.kubernetes.ca.etcd.advertised
  - .certs

{%- set node_name = grains['id'] %}
{%- set node_ip = grains['metalk8s']['control_plane_ip'] %}

{%- set endpoint = 'https://' ~ node_ip ~ ':2380' %}

{#- Get the list of existing etcd member. #}
{%- set etcd_members = pillar.metalk8s.etcd.members %}

{%- if pillar.get('is_bootstrap') and not etcd_members %}
  {%- set state = 'new' %}
  {%- set etcd_endpoints = {node_name: endpoint} %}
{%- else %}
  {%- set state = 'existing' %}

  {%- set etcd_endpoints = {} %}
  {#- NOTE: Filter out members with empty name as they are not started yet. #}
  {%- for member in etcd_members | selectattr('name') %}
    {#- NOTE: Only take first peer_urls for endpoint. #}
    {%- do etcd_endpoints.update({member['name']: member['peer_urls'][0]}) %}
  {%- else %}
    {{ raise('List of active etcd members is empty, cannot reference the existing cluster state.') }}
  {%- endfor %}

  {#- Add ourselves to the endpoints. #}
  {%- do etcd_endpoints.update({node_name: endpoint}) %}
{%- endif %}

{%- set etcd_initial_cluster = [] %}
{%- for name, ep in etcd_endpoints.items() %}
  {%- do etcd_initial_cluster.append(name ~ '=' ~ ep) %}
{%- endfor %}

Create etcd database directory:
  file.directory:
    - name: /var/lib/etcd
    - dir_mode: '0750'
    - user: root
    - group: root
    - makedirs: True

Create local etcd Pod manifest:
  metalk8s.static_pod_managed:
    - name: /etc/kubernetes/manifests/etcd.yaml
    - source: salt://{{ slspath }}/files/manifest.yaml.j2
    - config_files:
        - /etc/kubernetes/pki/etcd/ca.crt
        - {{ certificates.server.files['etcd-peer'].path }}
        - /etc/kubernetes/pki/etcd/peer.key
        - {{ certificates.server.files.etcd.path }}
        - /etc/kubernetes/pki/etcd/server.key
    - context:
        name: etcd
        image_name: {{ build_image_name('etcd') }}
        command:
        # kubeadm flags {
          - etcd
          - --advertise-client-urls=https://{{ node_ip }}:2379
          - --cert-file={{ certificates.server.files.etcd.path }}
          - --client-cert-auth=true
          - --data-dir=/var/lib/etcd
          - --initial-advertise-peer-urls=https://{{ node_ip }}:2380
          - --initial-cluster={{ etcd_initial_cluster| sort | join(',') }}
          - --key-file=/etc/kubernetes/pki/etcd/server.key
          - --listen-client-urls=https://127.0.0.1:2379,https://{{ node_ip }}:2379
          - --listen-metrics-urls=http://127.0.0.1:2381,http://{{ node_ip }}:2381
          - --listen-peer-urls=https://{{ node_ip }}:2380
          - --name={{ node_name }}
          - --peer-cert-file={{ certificates.server.files['etcd-peer'].path }}
          - --peer-client-cert-auth=true
          - --peer-key-file=/etc/kubernetes/pki/etcd/peer.key
          - --peer-trusted-ca-file=/etc/kubernetes/pki/etcd/ca.crt
          - --snapshot-count=10000
          - --trusted-ca-file=/etc/kubernetes/pki/etcd/ca.crt
        # }
          - --initial-cluster-state={{ state }}
        volumes:
          - path: /var/lib/etcd
            name: etcd-data
          - path: /etc/kubernetes/pki/etcd
            name: etcd-certs
            readOnly: true
        etcd_healthcheck_cert: {{ certificates.client.files['etcd-healthcheck'].path }}
    - require:
      - file: Create etcd database directory
      - file: Ensure etcd CA cert is present

{#- In some case we may want to deploy etcd manifest but etcd do not work
    properly, so we need to skip this health check
    (e.g.: When we deploy a new etcd and member not yet registered #}
{%- if not pillar.get('metalk8s', {}).get('skip_etcd_healthcheck', False) %}

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
      - {{ certificates.server.files.etcd.path }}
      - /etc/kubernetes/pki/etcd/server.key
    - status: 200
    - match: '{"health":"true"}'
    - require:
      - module: Delay after etcd pod deployment

{%- endif %}
