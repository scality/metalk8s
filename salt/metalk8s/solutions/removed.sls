{# Archives to remove can be passed as pillar arguments. Future improvements
   could include removing by Solution name and/or version #}
{%- set archives = pillar.get('archives', none) %}

{%- set configured = pillar.metalk8s.solutions.configured | default([]) %}
{%- set deployed = pillar.metalk8s.solutions.deployed | default({}) %}

{%- if deployed %}
  {%- for solution_name, versions in deployed.items() %}
    {%- for version_info in versions %}
      {%- set lower_name = solution_name | lower | replace(' ', '-') %}
      {%- set full_name = lower_name ~ '-' ~ version_info.version %}
      {%- if version_info.iso not in configured %}
        {%- if archives is none or version_info.iso in archives %}
Umount Solution {{ full_name }}:
  mount.unmounted:
    - name: /srv/scality/{{ full_name }}
    - device: {{ version_info.iso }}
    - persist: True

Clean mount point for Solution {{ full_name }}:
  file.absent:
    - name: /srv/scality/{{ full_name }}
    - require:
      - mount: Umount solution {{ full_name }}
        {%- else %}  {# Unconfigured but filtered out from pillar args #}
Unconfigured Solution {{ full_name }} remains:
  test.succeed_without_changes:
    - name: {{ full_name }} remains

        {%- endif %}
      {%- else %}  {# Still configured #}
Solution {{ full_name }} remains:
  test.succeed_without_changes:
    - name: {{ solution_name }} remains

      {%- endif %}
    {%- endfor %}
  {%- endfor %}
{%- else %}
No solution to unmount:
  test.succeed_without_changes:
    - name: Nothing to do
{%- endif %}
