{%- from "metalk8s/map.jinja" import metalk8s with context %}
{%- from "metalk8s/map.jinja" import repo with context %}

Install python-apt:
  pkg.installed:
    - name: python-apt

{%- for repo_name, repo_config in repo.repositories.items() %}
Configure {{ repo_name }} repository:
  pkgrepo.managed:
    - name : {{ repo_config.name }}
    - file: '/etc/apt/sources.list.d/{{ repo_name }}.list'
    - require:
      - pkg: Install python-apt
{%- endfor %}

- file: Add APT metalk8s repositories preferences:
  file.managed:
    - name: /etc/apt/preferences.d/1001-metalk8s
    - contents: |
        Package: *
        Pin: release l=metalk8s
        Pin-Priority: 1001

Repositories configured:
  test.succeed_without_changes:
    - require:
{%- for repository_name in repo.repositories.keys() %}
      - pkgrepo: Configure {{ repository_name }} repository
{%- endfor %}
