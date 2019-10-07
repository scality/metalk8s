{# FIXME: stupid question - is it necessary to split mount/configure states? #}

{%- if 'archives' in pillar %}
  {# Allow passing an explicit list of archives to mount, for CLI control. #}
  {%- set archives = pillar.archives %}
{%- else %}
  {%- set archives = pillar.metalk8s.solutions.configured %}
{%- endif %}

{%- if archives %}
  {%- for archive_path in archives %}
    {%- set solution = salt['metalk8s.archive_info_from_iso'](archive_path) %}
    {%- set lower_name = solution.name | lower | replace(' ', '-') %}
    {%- set full_name = lower_name ~ '-' ~ solution.version %}
    {%- set mount_path = "/srv/scality/" ~ full_name %}
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

# Validate archive contents
# TODO: This should be moved before mounting the solution's ISO
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

  {%- endfor %}
{% else %}
No Solution to mount:
  test.succeed_without_changes:
    - name: Nothing to do
{% endif %}
