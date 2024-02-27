{%- from "metalk8s/map.jinja" import metalk8s with context %}
{%- set archives = salt.metalk8s.get_archives() %}

Configure salt minion for local mode:
  file.serialize:
    - name: /etc/salt/minion.d/99-metalk8s-local.conf
    - user: root
    - group: root
    - mode: '0644'
    - formatter: yaml
    - makedirs: true
    - backup: false
    - dataset:
        log_level_logfile: {{ 'debug' if metalk8s.debug else 'info' }}
        file_roots:
        {%- for env, info in archives.items() | sort(attribute='0') %}
          {{ env }}:
            - {{ salt.file.join(info.path, 'salt') }}
        {%- endfor %}
        pillar_roots:
        {%- for env, info in archives.items() | sort(attribute='0') %}
          {{ env }}:
            - {{ salt.file.join(info.path, 'pillar') }}
        {%- endfor %}
        ext_pillar_first: true
        ext_pillar:
          - metalk8s: /etc/metalk8s/bootstrap.yaml
        retry_dns_count: 3
        enable_fqdns_grains: false
        grains_cache: true
