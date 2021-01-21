{%- from "metalk8s/map.jinja" import metalk8s with context %}
{%- from "metalk8s/map.jinja" import repo with context %}

{%- set repo_host = pillar.metalk8s.endpoints['repositories'].ip %}
{%- set repo_port = pillar.metalk8s.endpoints['repositories'].ports.http %}

{%- for repo_name, repo_config in repo.repositories.items() %}
  {%- if repo.local_mode %}
    {%- set repo_url = "file://" ~
                       salt.metalk8s.get_archives()[saltenv].path ~ "/" ~
                       repo.relative_path ~ "/" ~
                       grains['os_family'].lower() ~
                       "/" ~ repo_name %}
  {%- else %}
    {%- set repo_url = "http://" ~ repo_host ~ ':' ~ repo_port ~
                       "/" ~ saltenv ~ "/" ~ grains['os_family'].lower() ~
                       "/" ~ repo_name %}
  {%- endif %}
  {%- set options = [] %}
  {%- for name, value in repo_config.options.items() %}
    {%- do options.append(name ~ "=" ~ value) %}
  {%- endfor %}
Configure {{ repo_name }} repository:
  file.managed:
    - name: '/etc/apt/sources.list.d/{{ repo_name }}.list'
    - source: 'salt://{{ slspath }}/files/apt.sources.list.j2'
    - template: jinja
    - user: root
    - group: root
    - mode: '0644'
    - context:
        type: {{ repo_config.type }}
        options: {{ options }}
        url: {{ repo_url }}
        distribution: {{ grains['oscodename'] }}
        components: {{ repo_config.components }}
    - require_in:
      - test: Repositories configured
{%- endfor %}

Add APT metalk8s repositories preferences:
  file.managed:
    - name: /etc/apt/preferences.d/1001-metalk8s
    - contents: |
        Package: *
        Pin: release l=metalk8s
        Pin-Priority: 1001

Repositories configured:
  test.succeed_without_changes:
    - require:
      - file: Add APT metalk8s repositories preferences
