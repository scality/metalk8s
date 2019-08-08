{%- set desired_soltions_list = pillar.metalk8s.solutions.configured or [] %}
{%- set existent_solutions_dict = pillar.metalk8s.solutions.deployed or {} %}
{%- if existent_solutions_dict %}
{%- for _, solution in existent_solutions_dict.items() %}
  {%- if solution.iso not in desired_soltions_list %}
    # Solution already unconfigured, unmount it now
Umount solution {{ solution.name }}-{{ solution.version }}:
  mount.unmounted:
    - name: /srv/scality/{{ solution.name }}-{{ solution.version }}
    - device: {{ solution.iso }}
    - persist: True
Clean mount point for solution {{ solution.name }}-{{ solution.version }}:
  file.absent:
    - name: /srv/scality/{{ solution.name }}-{{ solution.version }}
  {%- else %}
Solution {{ solution.name }}-{{ solution.version }} remains:
  test.succeed_without_changes:
    - name: {{ solution.name }} remains
  {%- endif %}
{%- endfor %}
{%- else %}
No solution to unmount:
  test.succeed_without_changes
{%- endif %}