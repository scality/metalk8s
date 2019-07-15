{%- set dest_version = pillar.orchestrate.dest_version %}

{#- When downgrading saltenv should be the newest version #}
{%- set nodes_versions = pillar.metalk8s.nodes.values() | map(attribute='version') | list %}
{%- do nodes_versions.sort(cmp=salt.pkg.version_cmp, reverse=True) %}
{%- set expected = nodes_versions | first %}
{%- if saltenv != 'metalk8s-' ~  expected %}

Invalid saltenv "{{ saltenv }}" consider using "metalk8s-{{ expected }}":
  test.fail_without_changes

{%- else %}

Correct saltenv "{{ saltenv }}" for downgrade to "{{ dest_version }}":
  test.succeed_without_changes

{%- endif %}

{%- set dest = (dest_version|string).split('.') %}
{%- for node, values in pillar.metalk8s.nodes.items() %}

  {#- As we don't know how many minor version we do before a new major,
      never block downgrade between major version #}
  {%- set current = (values['version']|string).split('.') %}
  {%- set version_cmp = salt.pkg.version_cmp(dest_version, values['version']) %}
  {%- if dest[0]|int == current[0]|int
     and current[1]|int - dest[1]|int > 1 %}

Unable to downgrade from more than 1 minor version, Node {{ node }} from {{ values['version'] }} to {{ dest_version }}:
  test.fail_without_changes

  {#- If dest_version = 2.1.0 and values['version'] = 2.1.0-dev, version_cmp = 0
      but we should not downgrade this node #}
  {%- elif version_cmp == 1
    or (version_cmp == 0 and dest_version != values['version']|string and '-' not in dest_version) %}

Node {{ node }} ignored, already in {{ values['version'] }} older than {{ dest_version }}:
  test.succeed_without_changes

  {%- elif dest_version != values['version']|string %}

Node {{ node }} will be downgraded from {{ values['version'] }} to {{ dest_version }}:
  test.succeed_without_changes

  {%- elif version_cmp == 0 %}

Node {{ node }} already in version {{ dest_version }}:
  test.succeed_without_changes

  {%- else %}

# Should never happen
Unable to compare version for node {{ node }}, version_cmp {{ dest_version }} {{ values['version'] }} = {{ version_cmp }}:
  test.fail_without_changes

  {%- endif %}

{%- endfor %}
