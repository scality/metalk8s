#
# Management of Solution archives, mount/unmount and expose container images
#
# Relies on the `archives` key from /etc/metalk8s/solutions.yaml
#

{%- from "metalk8s/map.jinja" import repo with context %}

include:
  - metalk8s.repo.installed

{%- macro extract_info(archive_path) %}
  
  {{ machine_name }},{{ display_name }},{{ mount_path }}
{%- endmacro %}

{%- if '_errors' in pillar.metalk8s.solutions.config %}
Cannot proceed with mounting of Solution archives:
  test.fail_without_changes:
    - comment: "Errors: {{ pillar.metalk8s.solutions.config._errors | join('; ') }}"

{%- else %}
  {#- Mount configured #}
  {%- set configured = pillar.metalk8s.solutions.config.archives %}
  {%- for archive_path in configured %}
    {%- set solution = salt['metalk8s.archive_info_from_iso'](archive_path) %}
    {%- set lower_name = solution.name | replace(' ', '-') | lower %}
    {%- set machine_name = lower_name ~ '-' ~ solution.version %}
    {%- set display_name = solution.name ~ ' ' ~ solution.version %}
    {%- set mount_path = "/srv/scality/" ~ machine_name -%}

{# Mount the archive #}
Mountpoint for Solution {{ display_name }} exists:
  file.directory:
    - name: {{ mount_path }}
    - makedirs: true

Archive of Solution {{ display_name }} is mounted at {{ mount_path }}:
  mount.mounted:
    - name: {{ mount_path }}
    - device: {{ archive_path }}
    - fstype: iso9660
    - mkmnt: false
    - opts:
      - ro
      - nofail
    - persist: true
    - match_on:
      - name
    - require:
      - file: Mountpoint for Solution {{ display_name }} exists

{# Validate the archive contents
   TODO: This should be moved before mounting the solution's ISO, using some
   custom module #}
Product information for Solution {{ display_name }} exists:
  file.exists:
    - name: {{ mount_path }}/product.txt
    - require:
      - mount: Archive of Solution {{ display_name }} is mounted at {{ mount_path }}

Container images for Solution {{ display_name }} exist:
  file.exists:
    - name: {{ mount_path }}/images
    - require:
      - mount: Archive of Solution {{ display_name }} is mounted at {{ mount_path }}

Expose container images for Solution {{ display_name }}:
  file.managed:
    - source: {{ mount_path }}/registry-config.inc.j2
    - name: {{ repo.config.directory }}/{{ machine_name }}-registry-config.inc
    - template: jinja
    - defaults:
        repository: {{ machine_name }}
        registry_root: {{ mount_path }}/images
    - require:
      - file: Container images for Solution {{ display_name }} exist
    - onchanges_in:
      - sls: metalk8s.repo.installed

  {%- endfor %} {# Configured solutions are all mounted and images exposed #}

  {#- Unmount all Solution ISOs mounted in /srv/scality not referenced in
      the configuration file #}
  {%- set available = pillar.metalk8s.solutions.available %}
  {%- for name, info in available %}
    {%- if info.archive not in configured %}
      {%- set display_name = info.display_name ~ ' ' ~ info.version %}
      {%- if info.active %}
Cannot remove archive for active Solution {{ display_name }}:
  test.fail_without_changes:
    - name: Solution {{ display_name }} is still active, cannot remove it

      {%- else %}
Remove container images for Solution {{ display_name }}:
  file.absent:
    - name: {{ repo.config.directory }}/{{ name }}-registry-config.inc
    - onchanges_in:
      - sls: metalk8s.repo.installed

Unmount Solution {{ display_name }}:
  mount.unmounted:
    - name: {{ info.mountpoint }}
    - device: {{ info.archive }}
    - persist: True
    - require:
      - file: Remove container images for Solution {{ display_name }}

Clean mountpoint for Solution {{ display_name }}:
  file.absent:
    - name: {{ info.mountpoint }}
    - require:
      - mount: Unmount Solution {{ display_name }}

      {%- endif %}
    {%- endif %}
  {%- endfor %}
{%- endif %}
