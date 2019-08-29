{%- set configured = pillar.metalk8s.solutions.configured or [] %}
{%- set deployed = pillar.metalk8s.solutions.deployed or {} %}
{%- if deployed %}
{%- for solution_name, versions in deployed.items() %}
  {%- for version_info in versions %}
    {%- set lower_name = solution_name | lower | replace(' ', '-') %}
    {%- set full_name = lower_name ~ '-' ~ version_info.version %}
    {%- if version_info.iso not in configured %}
Unconfigure nginx for solution {{ full_name }}:
  file.absent:
    - name: /var/lib/metalk8s/repositories/conf.d/{{ full_name }}-registry-config.inc

    {%- else %}
Keeping configuration for solution {{ full_name }}:
  test.succeed_without_changes:
    - name: Nginx for solution {{ solution_name }} remains

    {%- endif %}
  {%- endfor %}
{%- endfor %}
{%- else %}
No solution to unconfigure:
  test.succeed_without_changes
{%- endif %}