{%- from "metalk8s/map.jinja" import metalk8s with context %}
{%- from "metalk8s/map.jinja" import packages with context %}
{%- from "metalk8s/map.jinja" import repo with context %}
{%- from "metalk8s/map.jinja" import package_exclude_list with context %}

{%- set repo_base_urls = [] %}
{%- if repo.local_mode %}
  {%- do repo_base_urls.append("file://" ~
                               salt.metalk8s.get_archives()[saltenv].path ~ "/" ~
                               repo.relative_path ~ "/" ~
                               grains['os_family'].lower() ~ "/" ~
                               "$metalk8s_osmajorrelease") %}

{%- else %}
  {%- set pillar_endpoints = metalk8s.endpoints.repositories %}
  {%- if not pillar_endpoints | is_list %}
    {%- set pillar_endpoints = [pillar_endpoints] %}
  {%- endif %}
  {%- for endpoint in pillar_endpoints %}
    {%- do repo_base_urls.append("http://" ~
                                endpoint.ip ~ ":" ~ endpoint.ports.http ~
                                "/" ~ saltenv ~ "/" ~
                                grains['os_family'].lower() ~ "/" ~
                                "$metalk8s_osmajorrelease") %}
  {%- endfor %}
{%- endif %}

Set metalk8s_osmajorrelease in yum vars:
  file.managed:
    - name: /etc/yum/vars/metalk8s_osmajorrelease
    - contents: {{ grains['osmajorrelease'] }}

Install yum-utils:
  pkg.installed:
    - name: yum-utils

Install yum-plugin-versionlock:
  pkg.installed:
    - name: {{
        packages.get('yum-plugin-versionlock', 'yum-plugin-versionlock') }}

Ensure yum plugins are enabled:
  ini.options_present:
    - name: /etc/yum.conf
    - sections:
        main:
          plugins: 1
    - require_in:
      - test: Repositories configured

Ensure yum versionlock plugin is enabled:
  ini.options_present:
    - name: /etc/yum/pluginconf.d/versionlock.conf
    - sections:
        main:
          enabled: 1
    - require_in:
      - test: Repositories configured
    - require:
      - pkg: Install yum-plugin-versionlock

{%- for repo_name, repo_config in repo.repositories.items() %}
  {%- set repo_urls = [] %}
  {%- for base_url in repo_base_urls %}
    {%- do repo_urls.append(base_url ~ "/" ~
                            repo_name ~ "-el$metalk8s_osmajorrelease") %}
  {%- endfor %}
  {%- set gpg_keys = [] %}
  {%- for gpgkey in repo_config.gpgkeys %}
    {# NOTE: We only use the first repo URL for GPG key since these are the same,
       and we do not want to depend on both repos to import this key.
       When installing a package, if the package's GPG key is not already imported
       on the host, it will try to import **all** GPG keys listed and will fail if
       unable to download one of them #}
    {%- do gpg_keys.append(repo_urls[0] ~ "/" ~ gpgkey) %}
  {%- endfor %}
Configure {{ repo_name }} repository:
  pkgrepo.managed:
    - name: {{ repo_name }}
    - humanname: {{ repo_config.humanname }}
    - baseurl: {{ repo_urls | join(' ') }}
    - gpgcheck: {{ repo_config.gpgcheck }}
  {%- if gpg_keys %}
    - gpgkey: "{{ gpg_keys | join (' ') }}"
  {%- endif %}
    - repo_gpg_check: {{ repo_config.repo_gpg_check }}
    - enabled: {{ repo_config.enabled }}
    # Set priority to 1, even if the `yum-plugin-priorities` is not installed,
    # so that our repos has priority over others
    - priority: 1
    # URL to the proxy server for this repository.
    # Set to '_none_' to disable the global proxy setting
    # for this repository.
    - proxy: _none_
    - refresh: false
    - onchanges_in:
      - cmd: Refresh yum cache
    - require:
      - file: Set metalk8s_osmajorrelease in yum vars
    - require_in:
      - test: Repositories configured
    - onchanges_in:
      - module: Check packages availability
{%- endfor %}

# Refresh cache manually as we use the same repo name for all versions
Refresh yum cache:
  # Refresh_db not enough as it's only expire-cache
  cmd.run:
    - name: yum clean all
  module.run:
    - pkg.refresh_db: []
    - onchanges:
      - cmd: Refresh yum cache

Check packages availability:
  module.run:
    - metalk8s_package_manager.check_pkg_availability:
      - pkgs_info: {{ repo.packages | tojson }}
      - exclude: {{ package_exclude_list | tojson }}
    - require_in:
      - test: Repositories configured

Repositories configured:
  test.succeed_without_changes
