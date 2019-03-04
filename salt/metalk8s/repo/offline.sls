{%- from "metalk8s/map.jinja" import repo with context %}

{%- if not repo.local_mode %}
include:
  - .deployed
{% endif %}

{%- for repo_name, repo_config in repo.repositories.items() %}
  {%- if repo.local_mode %}
    {%- set repo_base_url = "file://" ~ repo.base_path %}
  {%- else %}
    {%- set repo_base_url = "http://" ~ repo.host ~ ':' ~ repo.port %}
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
