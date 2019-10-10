#
# States to mount configured Solution ISOs and expose their images to
# the cluster
#
# Relies on `pillar.archives` to filter which ISO to consider

{%- from "metalk8s/map.jinja" import repo with context %}

include:
  - metalk8s.repo.installed

{%- set filter_archives = pillar.get('archives') %}
{%- if filter_archives is none %}
  {%- set archives = pillar.metalk8s.solutions.configured %}
{%- else %}
  {%- set archives =
        pillar.metalk8s.solutions.configured | difference(filter_archives) %}
{%- endif %}

{%- if archives %}
  {%- for archive_path in archives %}
    {%- set solution = salt['metalk8s.archive_info_from_iso'](archive_path) %}
    {%- set lower_name = solution.name | lower | replace(' ', '-') %}
    {%- set full_name = lower_name ~ '-' ~ solution.version %}
    {%- set mount_path = "/srv/scality/" ~ full_name %}
# Mount the archive
Solution mountpoint {{ mount_path }} exists:
  file.directory:
    - name: {{ mount_path }}
    - makedirs: true

Solution archive {{ archive_path }} is available at {{ mount_path }}:
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
      - file: Solution mountpoint {{ mount_path }} exists

# Validate the archive contents
# TODO: This should be moved before mounting the solution's ISO, using some
# custom module
Assert '{{ mount_path }}/product.txt' exists:
  file.exists:
    - name: {{ mount_path }}/product.txt
    - require:
      - mount: Solution {{ archive_path }} is available at {{ mount_path }}


Assert '{{ mount_path }}/images' exists:
  file.exists:
    - name: {{ mount_path }}/images
    - require:
      - mount: Solution {{ archive_path }} is available at {{ mount_path }}

Assert '{{ mount_path }}/operator/deploy' exists:
  file.exists:
    - name: {{ mount_path }}/operator/deploy
    - require:
      - mount: Solution {{ archive_path }} is available at {{ mount_path }}

# Expose images in the registry
Configure nginx for Solution {{ full_name }}:
  file.managed:
    - source: {{ path }}/registry-config.inc.j2
    - name: {{ repo.config.directory }}/{{ full_name }}-registry-config.inc
    - template: jinja
    - defaults:
        repository: {{ full_name }}
        registry_root: {{ path }}/images
    - onchanges_in:
      - sls: metalk8s.repo.installed

  {%- endfor %}
{% else %}
No Solution selected:
  test.succeed_without_changes:
    - comment: 
{% endif %}
