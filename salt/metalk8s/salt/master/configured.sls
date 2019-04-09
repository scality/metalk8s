{%- from "metalk8s/map.jinja" import metalk8s with context %}

Configure salt master:
  file.serialize:
    - name: /etc/salt/master.d/99-metalk8s.conf
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
        peer:
          .*:
            - x509.sign_remote_certificate
        ext_pillar:
          - metalk8s: /etc/metalk8s/bootstrap.yaml
        roster_defaults:
          minion_opts:
            use_superseded:
              - module.run
