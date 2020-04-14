#!jinja | metalk8s_kubernetes

{%- set data = {} %}
{%- set solutions = pillar.get('metalk8s', {}).get('solutions', {}).get('available', {}) %}
{%- for solution, versions in solutions.items() %}
  {%- do data.update({solution: versions | tojson}) %}
{%- endfor %}

apiVersion: v1
kind: ConfigMap
metadata:
  name: metalk8s-solutions
  namespace: metalk8s-solutions
data: {{ data | tojson }}
