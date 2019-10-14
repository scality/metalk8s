{%- from "metalk8s/map.jinja" import metalk8s with context %}
{%- from "metalk8s/map.jinja" import repo with context %}

{%- set repo_host = pillar.metalk8s.endpoints['repositories'].ip %}
{%- set repo_port = pillar.metalk8s.endpoints['repositories'].ports.http %}

Install python-apt:
  pkg.installed:
    - name: python-apt

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
  pkgrepo.managed:
    - name: >
        deb {{ "[" ~ options | join(" ") ~ "]" if options else "" }}
        {{ repo_url }} {{ grains['oscodename'] }}
    - file: '/etc/apt/sources.list.d/{{ repo_name }}.list'
    - dist: {{ grains['oscodename'] }}
    - comps: {{ repo_config.comps | join(',') }}
    - require:
      - pkg: Install python-apt
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
{%- for repository_name in repo.repositories.keys() %}
      - pkgrepo: Configure {{ repository_name }} repository
{%- endfor %}
