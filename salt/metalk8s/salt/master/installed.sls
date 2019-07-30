{% from "metalk8s/map.jinja" import metalk8s with context %}
{% from "metalk8s/map.jinja" import repo with context %}
{%- from "metalk8s/repo/macro.sls" import build_image_name with context -%}

{% set image_name = build_image_name('salt-master') %}
{% set image_version = repo.images['salt-master'].version %}

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
        image: {{ image_name }}
        version: {{ image_version }}
        products: {{ salt.metalk8s.get_products() }}
        salt_ip: "{{ salt_ip }}"
    - require:
      - file: Create salt master directories
      - file: /etc/salt/master.d/99-metalk8s.conf
      - file: /etc/salt/master.d/99-metalk8s-roots.conf

Delay after new pod deployment:
  module.wait:
    - test.sleep:
      - length: 10
    - watch:
      - metalk8s: Install and start salt master manifest

Make sure salt master container is up:
  module.wait:
    - cri.wait_container:
      - name: salt-master
      - state: running
    - watch:
      - metalk8s: Install and start salt master manifest
    - require:
      - module: Delay after new pod deployment

Wait for Salt API to answer:
  http.wait_for_successful_query:
    - name: http://{{ salt_ip }}:4507/
    - status: 200
    - require:
      - module: Make sure salt master container is up
