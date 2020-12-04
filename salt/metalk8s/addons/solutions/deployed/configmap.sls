#!jinja | metalk8s_kubernetes

{# Find all nodes with bootstrap role #}
{%- set found = [] %}
{%- for name, node in pillar.metalk8s.nodes.items() %}
  {%- if 'bootstrap' in node.roles %}
    {%- do found.append(name) %}
  {%- endif %}
{%- endfor %}

{# Retrieve available Solutions from the first bootstrap minion found
   NOTE: if we want to handle multi-bootstrap one day, this will need to be
   updated.
#}
{%- set bootstrap_id = found | first %}
{%- set available = salt.saltutil.cmd(
        tgt=bootstrap_id,
        fun='metalk8s_solutions.list_available',
    )[bootstrap_id]['ret']
%}

{%- set data = {} %}
{%- set active = pillar.metalk8s.solutions.active | d({}) %}
{%- for solution, versions in available.items() %}
  {%- set updated_versions = [] %}
  {%- for version in versions %}
    {%- set new_version = {} %}
    {%- do new_version.update(version) %}
    {%- do new_version.update(
            {'active': version.version == active.get(solution)}
        ) %}
    {%- do updated_versions.append(new_version) %}
  {%- endfor %}
  {%- do data.update({solution: updated_versions | tojson}) %}
{%- endfor %}

apiVersion: v1
kind: ConfigMap
metadata:
  name: metalk8s-solutions
  namespace: metalk8s-solutions
data: {{ data | tojson }}
