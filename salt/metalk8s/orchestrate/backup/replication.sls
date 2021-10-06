{%- from "metalk8s/repo/macro.sls" import build_image_name with context %}

{%- set master_nodes = salt.metalk8s.minions_by_role('master') %}
{%- set image = build_image_name("metalk8s-utils") %}

{%- for node in master_nodes | sort %}

Schedule backup replication Job on {{ node }}:
  metalk8s_kubernetes.object_present:
    - name: salt://{{ slspath }}/files/job.yaml.j2
    - template: jinja
    - defaults:
        node: {{ node }}
        image: {{ image }}

{%- endfor %}
