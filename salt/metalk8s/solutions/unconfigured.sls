{%- set desired_soltions_list = pillar.metalk8s.solutions.configured or [] %}
{%- set existent_solutions_dict = pillar.metalk8s.solutions.deployed or {} %}
{%- if existent_solutions_dict %}
{%- for _, solution in existent_solutions_dict.items() %}
  {%- if solution.iso not in desired_soltions_list %}
Unconfigure nginx for solution {{ solution.name }}-{{ solution.version }}:
  file.absent:
    - name: /var/lib/metalk8s/repositories/conf.d/{{solution.name}}-{{ solution.version }}-registry-config.inc
  {%- else %}
Keeping configuration for solution {{ solution.name }}-{{ solution.version }}:
  test.succeed_without_changes:
    - name: Nginx for solution {{ solution.name }} remains
  {%- endif %}
{%- endfor %}
{%- else %}
No solution to unconfigure:
  test.succeed_without_changes
{%- endif %}