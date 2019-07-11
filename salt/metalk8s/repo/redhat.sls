{%- from "metalk8s/map.jinja" import metalk8s with context %}
{%- from "metalk8s/map.jinja" import repo with context %}

{%- set repo_host = pillar.metalk8s.endpoints['repositories'].ip %}
{%- set repo_port = pillar.metalk8s.endpoints['repositories'].ports.http %}

Install yum-plugin-versionlock:
  pkg.installed:
    - name: yum-plugin-versionlock
    - fromrepo: {{ repo.repositories.keys() | join(',') }}
    - require:
      - test: Repositories configured

{%- for repo_name, repo_config in repo.repositories.items() %}
  {%- if repo.local_mode %}
    {%- set repo_base_url = "file://" ~ 
                            salt.metalk8s.get_products()[saltenv].path ~ "/" ~
                            repo.relative_path %}
  {%- else %}
    {%- set repo_base_url = "http://" ~ repo_host ~ ':' ~ repo_port ~ 
                            "/" ~ saltenv %}
  {%- endif %}
  {%- set repo_url = repo_base_url ~ "/" ~ repo_name ~ "-el$releasever" %}
  {%- set gpg_keys = [] %}
  {%- for gpgkey in repo_config.gpgkeys %}
    {%- do gpg_keys.append(repo_url ~ "/" ~ gpgkey) %}
  {%- endfor %}
Configure {{ repo_name }} repository:
  pkgrepo.managed:
    - name: {{ repo_name }}
    - humanname: {{ repo_config.humanname }}
    - baseurl: {{ repo_url }}
    - gpgcheck: {{ repo_config.gpgcheck }}
  {%- if gpg_keys %}
    - gpgkey: "{{ gpg_keys | join (' ') }}"
  {%- endif %}
    - repo_gpg_check: {{ repo_config.repo_gpg_check }}
    - enabled: {{ repo_config.enabled }}
    - refresh: false
    - onchanges_in:
      - cmd: Refresh yum cache
{%- endfor %}

# Refresh cache manually as we use the same repo name for all versions
Refresh yum cache:
  # Refresh_db not enough as it's only expire-cache
  cmd.run:
  - name: "yum clean all --disablerepo='*'
           --enablerepo='{{ repo.repositories.keys() | join(',') }}'"
  module.run:
    - pkg.refresh_db:
      - disablerepo: '*'
      - enablerepo: {{ repo.repositories.keys() | tojson }}
    - onchanges:
      - cmd: Refresh yum cache

Repositories configured:
  test.succeed_without_changes:
    - require:
{%- for repository_name in repo.repositories.keys() %}
      - pkgrepo: Configure {{ repository_name }} repository
{%- endfor %}
