{%- from "metalk8s/map.jinja" import metalk8s with context %}

Configure salt master:
  file.managed:
    - name: /etc/salt/master.d/99-metalk8s.conf
    - source: salt://metalk8s/salt/master/files/master_99-metalk8s.conf
    - user: root
    - group: root
    - mode: '0644'
    - makedirs: true
    - backup: false

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
