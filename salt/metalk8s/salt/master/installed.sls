{% from "metalk8s/map.jinja" import metalk8s with context %}

{% set salt_master_image = 'salt-master' %}
{% set salt_master_version = '2018.3.4-1' %}

{%- set salt_ip = grains['metalk8s']['control_plane_ip'] -%}

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
        salt_ip: "{{ salt_ip }}"
    - require:
      - file: Create salt master directories
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
    - name: http://{{ salt_ip }}:4507/
    - status: 200
