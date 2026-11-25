#
# Management of Solution archives, mount/unmount and expose container images
#
# Relies on the `archives` key from /etc/metalk8s/solutions.yaml
#

{%- from "metalk8s/map.jinja" import repo with context %}

{%- set available = pillar.metalk8s.solutions.available | d({}) %}
{%- set configured = pillar.metalk8s.solutions.config.archives | d([]) %}

{%- if '_errors' in pillar.metalk8s.solutions.config %}
Cannot proceed with mounting of Solution archives:
  test.fail_without_changes:
    - comment: "Errors: {{ pillar.metalk8s.solutions.config._errors | join('; ') }}"

{%- elif not available and not configured %}
No Solution found in configuration:
  test.succeed_without_changes

{%- else %}
  {%- set configured_by_name = {} %}

  {#- Mount configured #}
  {%- for archive_path in configured %}
    {%- set solution = salt['metalk8s_solutions.manifest_from_archive'](archive_path) %}
    {%- do configured_by_name.setdefault(solution.name, []).append(solution) %}
    {%- set is_directory = salt['file.directory_exists'](archive_path) %}
    {%- set display_name = solution.display_name ~ ' ' ~ solution.version %}
    {%- set mount_path = "/srv/scality/" ~ solution.id -%}

{# Mount the archive #}
Mountpoint for Solution {{ display_name }} exists:
  file.directory:
    - name: {{ mount_path }}
    - makedirs: true

Archive of Solution {{ display_name }} is mounted at {{ mount_path }}:
  mount.mounted:
    - name: {{ mount_path }}
    - device: {{ archive_path }}
    - mkmnt: false
    {%- if is_directory %}
    - fstype: none
    - opts:
      - bind
      - ro
      - nofail
    {#- The source may itself be a mount (an image tree under composefs): its
        options must not end up in fstab #}
    - bind_mount_copy_active_opts: false
    {%- else %}
    - fstype: iso9660
    - opts:
      - ro
      - nofail
    {%- endif %}
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
    - name: {{ mount_path }}/manifest.yaml
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
    - name: {{ repo.config.directory }}/{{ solution.id }}-registry-config.inc
    - template: jinja
    - makedirs: true
    - defaults:
        repository: {{ solution.id }}
        registry_root: {{ mount_path }}/images
    - require:
      - file: Container images for Solution {{ display_name }} exist

  {%- endfor %} {# Configured solutions are all mounted and images exposed #}

  {#- Expose the images of all configured versions of a Solution under its
      name, so that unchanged images keep the same reference across upgrades #}
  {%- for name, solutions in configured_by_name.items() | sort(attribute='0') %}

Expose container images for Solution {{ name }} without version:
  file.managed:
    - name: {{ repo.config.directory }}/{{ name }}-registry-config.inc
    - contents: __slot__:salt:metalk8s_solutions.registry_config(
        {{ ([name] + solutions | map(attribute='id') | list) | join(', ') }})
    - makedirs: true
    - require:
    {%- for solution in solutions %}
      - file: Container images for Solution {{ solution.display_name ~ ' ' ~ solution.version }} exist
    {%- endfor %}

  {%- endfor %}

  {#- Unmount all Solution ISOs mounted in /srv/scality not referenced in
      the configuration file #}
  {%- for machine_name, versions in available.items() %}
    {%- if machine_name not in configured_by_name %}
Remove container images for Solution {{ machine_name }} without version:
  file.absent:
    - name: {{ repo.config.directory }}/{{ machine_name }}-registry-config.inc

    {%- endif %}
    {%- for info in versions %}
      {%- if info.archive not in configured %}
        {%- set display_name = info.name ~ ' ' ~ info.version %}
        {%- if info.active %}
Cannot remove archive for active Solution {{ display_name }}:
  test.fail_without_changes:
    - name: Solution {{ display_name }} is still active, cannot remove it

        {%- else %}
Remove container images for Solution {{ display_name }}:
  file.absent:
    - name: {{ repo.config.directory }}/{{ info.id }}-registry-config.inc

{#- The kernel reports the mount under the resolved path when /srv is a
    symlink, while fstab holds the /srv path #}
Unmount Solution {{ display_name }}:
  mount.unmounted:
    - name: {{ info.mounted_at | d(info.mountpoint) }}
    - persist: False
    - require:
      - file: Remove container images for Solution {{ display_name }}

Remove Solution {{ display_name }} from fstab:
  mount.unmounted:
    - name: {{ info.mountpoint }}
    - persist: True
    - require:
      - mount: Unmount Solution {{ display_name }}

Clean mountpoint for Solution {{ display_name }}:
  file.absent:
    - name: {{ info.mountpoint }}
    - require:
      - mount: Remove Solution {{ display_name }} from fstab

        {%- endif %}
      {%- endif %}
    {%- endfor %}
  {%- endfor %}
{%- endif %}
