{%- from "metalk8s/map.jinja" import metalk8s with context %}
{%- from "metalk8s/map.jinja" import networks with context %}

{%- set ip_candidates = salt.network.ip_addrs(cidr=networks.control_plane) %}
{%- if ip_candidates %}
    {%- set salt_api_ip = ip_candidates[0] %}
{%- else %}
    {%- set salt_api_ip = '127.0.0.1' %}
{%- endif %}

Configure salt master:
  file.managed:
    - name: /etc/salt/master.d/99-metalk8s.conf
    - source: salt://metalk8s/salt/master/files/master_99-metalk8s.conf.j2
    - user: root
    - group: root
    - mode: '0644'
    - makedirs: true
    - backup: false
    - template: jinja
    - defaults:
        salt_api_ip: "{{ salt_api_ip }}"

Configure salt master roots paths:
  file.serialize:
    - name: /etc/salt/master.d/99-metalk8s-roots.conf
    - user: root
    - group: root
    - mode: '0644'
    - formatter: yaml
    - merge_if_exists: True
    - makedirs: true
    - backup: false
    - dataset:
        file_roots:
          {{ saltenv }}:
            - {{ metalk8s.iso_root_path }}/salt
        pillar_roots:
          {{ saltenv }}:
            - {{ metalk8s.iso_root_path }}/pillar
