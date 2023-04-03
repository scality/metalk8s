{%- from "metalk8s/repo/macro.sls" import build_image_name with context %}

{%- set master_nodes = salt.metalk8s.minions_by_role('master') %}
{%- set image = build_image_name("metalk8s-utils") %}

{%- set backup_folder = "/toto" %}

{%- for node in master_nodes | sort %}

Schedule backup cleanup Job on {{ node }}:
  metalk8s_kubernetes.object_present:
    - name: salt://{{ slspath }}/files/cleanup_job.yaml.j2
    - template: jinja
    - defaults:
        files: __slot__:salt:metalk8s_backups.get_backups_to_delete("{{ backup_folder }}", 5)
        node: {{ node }}
        image: {{ image }}

{%- endfor %}
