{%- from "metalk8s/map.jinja" import repo with context %}

{%- set products = salt.metalk8s.get_products() %}

Generate repositories nginx configuration:
  file.managed:
    - name: {{ salt.file.join(repo.config.directory, repo.config.default) }}
    - source: salt://{{ slspath }}/files/nginx.conf.j2
    - template: jinja
    - user: root
    - group: root
    - mode: '0644'
    - makedirs: true
    - backup: false
    - defaults:
        listening_port: {{ repo.port }}

Deploy common container registry nginx configuration:
  file.managed:
    - name: {{ salt.file.join(repo.config.directory, repo.config.common_registry) }}
    - source: salt://{{ slspath }}/files/metalk8s-registry-common.inc
    - user: root
    - group: root
    - mode: '0644'
    - makedirs: true
    - backup: false

Deploy container registry nginx configuration:
  file.managed:
    - name: {{ salt.file.join(repo.config.directory, '99-' ~ saltenv ~ '-registry.inc') }}
    - source: salt://{{ slspath }}/files/metalk8s-registry.inc
    - user: root
    - group: root
    - mode: '0644'
    - makedirs: true
    - backup: false

Generate container registry configuration:
  file.managed:
    - name: {{ salt.file.join(repo.config.directory, repo.config.registry) }}
    - source: salt://{{ slspath }}/files/metalk8s-registry-config.inc.j2
    - template: jinja
    - user: root
    - group: root
    - mode: '0644'
    - makedirs: true
    - backup: false
    - defaults:
        products: {{ products }}
