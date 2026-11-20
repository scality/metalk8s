include:
  - metalk8s.salt.minion.local

{#- The registry node agent takes these archives over once it runs: it checks
    them, mounts them again after a reboot (hence no fstab entry), and deletes
    any file in its archives directory that no NodeSolutionArchive claims. Copy
    through a directory it does not watch, so it never sees a partial file. #}
{%- set staging_dir = "/srv/scality/metalk8s/.staging" %}
{%- set agent_uid = 65532 %}

{%- for archive in salt.metalk8s.get_archives().values() | selectattr("iso") %}
  {%- set staging = staging_dir ~ "/" ~ salt.file.basename(archive.archive) %}
  {%- set solution_dir = salt.file.dirname(archive.path) %}

Create the staging directory for '{{ archive.archive }}':
  file.directory:
  - name: {{ staging_dir }}
  - makedirs: true

{#- The agent runs as {{ agent_uid }}, with no right to override file
    permissions: it removes a mount point when it unmounts an archive, so it
    must own the directory holding it, or that archive is never released. #}
Create registry directories for '{{ archive.archive }}':
  file.directory:
  - names:
    - {{ salt.file.dirname(archive.archive) }}
    - {{ salt.file.dirname(solution_dir) }}
    - {{ solution_dir }}
    - {{ archive.path }}
  - user: {{ agent_uid }}
  - group: {{ agent_uid }}
  - makedirs: true
  - require:
    - file: Create the staging directory for '{{ archive.archive }}'

Copy '{{ archive.iso }}' to '{{ archive.archive }}':
  cmd.run:
  - name: >-
      install -m 0644 -o {{ agent_uid }} -g {{ agent_uid }}
      '{{ archive.iso }}' '{{ staging }}'
      && mv -f '{{ staging }}' '{{ archive.archive }}'
  - creates: {{ archive.archive }}
  - require:
    - file: Create registry directories for '{{ archive.archive }}'

Mount '{{ archive.archive }}' at '{{ archive.path }}':
  mount.mounted:
  - name: {{ archive.path }}
  - device: {{ archive.archive }}
  - fstype: iso9660
  - mkmnt: false
  - opts:
    - ro
  - persist: false
  - match_on:
    - name
  - require:
    - cmd: Copy '{{ archive.iso }}' to '{{ archive.archive }}'

{%- endfor %}
