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
    {%- set iso_root = metalk8s.iso_root_path %}
    {%- set repo_base_url = "file://" ~ iso_root ~ "/" ~ repo.relative_path %}
  {%- else %}
    {%- set repo_base_url = "http://" ~ repo_host ~ ':' ~ repo_port %}
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
{%- endfor %}

Repositories configured:
  test.succeed_without_changes:
    - require:
{%- for repository_name in repo.repositories.keys() %}
      - pkgrepo: Configure {{ repository_name }} repository
{%- endfor %}
