{%- set products = salt.metalk8s.get_products() %}

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
        file_roots:
        {%- for env, info in products.items() | sort(attribute='0') %}
          {{ env }}:
            - {{ salt.file.join(info.path, 'salt') }}
        {%- endfor %}
        pillar_roots:
        {%- for env, info in products.items() | sort(attribute='0') %}
          {{ env }}:
            - {{ salt.file.join(info.path, 'pillar') }}
        {%- endfor %}
        use_superseded:
          - module.run
        ext_pillar_first: true
        ext_pillar:
          - metalk8s: /etc/metalk8s/bootstrap.yaml
        retry_dns_count: 3
