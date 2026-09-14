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

# Deploy the salt-ssh `ssh_pre_flight` script at a stable path so the
# `kubernetes` roster can reference it without resolving file_roots at runtime.
# It is run by salt-ssh on every new node before the thin tarball is deployed,
# to ensure a compatible Python 3 interpreter is installed.
Deploy salt-ssh pre-flight script:
  file.managed:
    - name: /etc/salt/ssh-preflight.sh
    - source: salt://metalk8s/salt/master/files/ssh-preflight.sh
    - user: root
    - group: root
    - mode: '0755'
    - makedirs: true
    - backup: false

# salt-ssh's get_roster_file() unconditionally requires the configured
# roster file to exist on disk, even with a non-flat backend like
# kubernetes. Provide an empty stub so `salt-ssh --roster=kubernetes
# <single-host>` doesn't fail with `OSError: Roster file
# "/etc/salt/roster" not found`. See saltstack/salt#46576. 
Create salt-ssh roster file:
  file.managed:
    - name: /etc/salt/roster
    - user: root
    - group: root
    - mode: '0644'
    - makedirs: true
    - backup: false
    - contents: ''
