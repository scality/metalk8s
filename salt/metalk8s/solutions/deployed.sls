{%- for _, solution in salt.solutions.get_unconfigured_solutions().items() %}
Deploy the operator for solution {{ solution.name }}:
  test.succeed_without_changes:
    - name: {{ solution.name }} NOT YET IMPLEMENTED
{%- enfor %}