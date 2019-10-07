{%- from "metalk8s/map.jinja" import repo with context %}

{# Archives to remove can be passed as pillar arguments. Future improvements
   could include removing by Solution name and/or version #}
{%- set archives = pillar.get('archives', none) %}

{%- set configured = pillar.metalk8s.solutions.configured or [] %}
{%- set deployed = pillar.metalk8s.solutions.deployed or {} %}

{%- if deployed %}
  {%- for solution_name, versions in deployed.items() %}
    {%- for version_info in versions %}
      {%- set lower_name = solution_name | lower | replace(' ', '-') %}
      {%- set full_name = lower_name ~ '-' ~ version_info.version %}
      {%- if version_info.iso not in configured %}
        {%- if archives is none or version_info.iso in archives %}
Remove container images for Solution {{ full_name }}:
  file.absent:
    - name: {{ repo.config.directory }}/{{ full_name }}-registry-config.inc

        {%- else %}  {# Unconfigured but filtered out from pillar args #}
Keep container images for unconfigured Solution {{ full_name }}:
  test.succeed_without_changes:
    - name: Images for Solution {{ full_name }} remains

        {%- endif %}
      {%- else %}  {# Still configured #}
Keep container images for Solution {{ full_name }}:
  test.succeed_without_changes:
    - name: Images for Solution {{ full_name }} remains

      {%- endif %}
    {%- endfor %}
  {%- endfor %}
{%- else %}
No selected Solution to unconfigure:
  test.succeed_without_changes:
    - name: Nothing to do
{%- endif %}
