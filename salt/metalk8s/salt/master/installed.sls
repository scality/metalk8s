{% from "metalk8s/map.jinja" import metalk8s with context %}
{% from "metalk8s/map.jinja" import repo with context %}
{%- from "metalk8s/repo/macro.sls" import build_image_name with context -%}

{% set image_name = build_image_name('salt-master') %}
{% set image_version = repo.images['salt-master'].version %}

{%- set salt_ip = grains['metalk8s']['control_plane_ip'] -%}

{%- set solution_archives = {} %}
{%- set solutions_available = salt.metalk8s_solutions.list_available() %}
{%- for versions in solutions_available.values() %}
  {%- for version in versions %}
    {%- set version_sanitized = version.id | replace('.', '-') %}
    {%- do solution_archives.update({version_sanitized: version.mountpoint}) %}
  {%- endfor %}
{%- endfor %}

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
        debug: {{ metalk8s.debug }}
        image: {{ image_name }}
        version: {{ image_version }}
        archives: {{ salt.metalk8s.get_archives() | tojson }}
        solution_archives: {{ solution_archives | tojson }}
        salt_ip: "{{ salt_ip }}"
    - require:
      - file: Create salt master directories
      - file: /etc/salt/master.d/99-metalk8s.conf
      - file: /etc/salt/master.d/99-metalk8s-roots.conf

Delay after new pod deployment:
  module.run:
    - test.sleep:
      - length: 10
    - onchanges:
      - metalk8s: Install and start salt master manifest

Make sure salt master container is up:
  module.run:
    - cri.wait_container:
      - name: salt-master
      - state: running
      - timeout: 180
    - onchanges:
      - metalk8s: Install and start salt master manifest
    - require:
      - module: Delay after new pod deployment

Wait for Salt API to answer:
  http.wait_for_successful_query:
    - name: https://{{ salt_ip }}:4507/
    - ca_bundle: /etc/kubernetes/pki/ca.crt
    - status: 200
    - require:
      - module: Make sure salt master container is up
