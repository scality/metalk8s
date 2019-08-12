{%- set configured = pillar.metalk8s.solutions.configured or [] %}
{%- set deployed = pillar.metalk8s.solutions.deployed or {} %}
{%- if deployed %}
{%- for solution_name, versions in deployed.items() %}
  {%- for version_info in versions %}
    {%- set lower_name = solution_name | lower | replace(' ', '-') %}
    {%- set full_name = lower_name ~ '-' ~ version_info.version %}
    {%- if version_info.iso not in configured %}
# Solution already unconfigured, unmount it now
Umount solution {{ full_name }}:
  mount.unmounted:
    - name: /srv/scality/{{ full_name }}
    - device: {{ version_info.iso }}
    - persist: True

Clean mount point for solution {{ full_name }}:
  file.absent:
    - name: /srv/scality/{{ full_name }}
    - require:
      - mount: Umount solution {{ full_name }}

    {%- else %}
Solution {{ full_name }} remains:
  test.succeed_without_changes:
    - name: {{ solution_name }} remains

    {%- endif %}
  {%- endfor %}
{%- endfor %}
{%- else %}
No solution to unmount:
  test.succeed_without_changes

{%- endif %}