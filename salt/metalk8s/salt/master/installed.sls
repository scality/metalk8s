{% from "metalk8s/map.jinja" import metalk8s with context %}

{% set salt_master_image = 'salt-master' %}
{% set salt_master_version = '2018.3.4-1' %}

{%- from "metalk8s/map.jinja" import networks with context %}

{%- set ip_candidates = salt.network.ip_addrs(cidr=networks.control_plane) %}
{%- if ip_candidates %}
    {%- set salt_api_ip = ip_candidates[0] %}
{%- else %}
    {%- set salt_api_ip = '127.0.0.1' %}
{%- endif %}

include:
  - .configured

Create salt master directories:
  file.directory:
    - user: root
    - group: root
    - mode: '0700'
    - makedirs: true
    - names:
      - /etc/salt
      - /var/cache/salt
      - /var/run/salt

Install and start salt master manifest:
  metalk8s.static_pod_managed:
    - name: /etc/kubernetes/manifests/salt-master.yaml
    - source: salt://metalk8s/salt/master/files/salt-master-manifest.yaml.j2
    - config_files:
      - /etc/salt/master.d/99-metalk8s.conf
      - /etc/salt/master.d/99-metalk8s-roots.conf
    - context:
        salt_master_image: {{ salt_master_image }}
        salt_master_version: {{ salt_master_version }}
        iso_root_path: {{ metalk8s.iso_root_path }}
        salt_api_ip: "{{ salt_api_ip }}"
    - require:
      - file: Create salt master directories
    - onchanges:
      - file: /etc/salt/master.d/99-metalk8s.conf
      - file: /etc/salt/master.d/99-metalk8s-roots.conf

Make sure salt master container is up:
  module.wait:
    - cri.wait_container:
      - name: salt-master
      - state: running
    - watch:
      - metalk8s: Install and start salt master manifest

Wait for Salt API to answer:
  http.wait_for_successful_query:
    - name: http://{{ salt_api_ip }}:4507/
    - status: 200
