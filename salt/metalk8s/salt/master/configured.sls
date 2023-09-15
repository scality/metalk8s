{%- from "metalk8s/map.jinja" import certificates with context -%}
{%- from "metalk8s/map.jinja" import metalk8s with context -%}

{%- set salt_ip = grains['metalk8s']['control_plane_ip'] -%}
{%- set archives = salt.metalk8s.get_archives() %}

Configure salt master:
  file.managed:
    - name: /etc/salt/master.d/99-metalk8s.conf
    - source: salt://metalk8s/salt/master/files/master-99-metalk8s.conf.j2
    - user: root
    - group: root
    - mode: '0644'
    - makedirs: true
    - backup: false
    - template: jinja
    - defaults:
        debug: {{ metalk8s.debug }}
        salt_ip: "{{ salt_ip }}"
        kubeconfig: "{{ certificates.kubeconfig.files['salt-master'].path }}"
        salt_api_ssl_crt: {{ certificates.server.files['salt-api'].path }}
        saltenv: "{{ saltenv }}"
        worker_threads: {{ salt.pillar.get("salt:master:worker_threads", default=12) }}
        timeout: {{ salt.pillar.get("salt:master:timeout", default=20) }}

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
        {%- for env in archives.keys() | sort(attribute='0') %}
          {{ env }}:
            - /srv/scality/{{ env }}/salt
        {%- endfor %}
        pillar_roots:
        {%- for env in archives.keys() | sort(attribute='0') %}
          {{ env }}:
            - /srv/scality/{{ env }}/pillar
        {%- endfor %}
