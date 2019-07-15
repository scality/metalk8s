{%- set dest_version = pillar.orchestrate.dest_version %}

{#- When upgrading saltenv should be the destination version #}
{%- if saltenv != 'metalk8s-' ~ dest_version %}

Invalid saltenv "{{ saltenv }}" consider using "metalk8s-{{ dest_version }}":
  test.fail_without_changes

{%- else %}

Correct saltenv "{{ saltenv }}" for upgrade to "{{ dest_version }}":
  test.succeed_without_changes

{%- endif %}

{%- set dest = (dest_version|string).split('.') %}
{%- for node, values in pillar.metalk8s.nodes.items() %}

  {#- As we don't know how many minor version we do before a new major,
      never block upgrade between major version #}
  {%- set current = (values['version']|string).split('.') %}
  {%- set version_cmp = salt.pkg.version_cmp(dest_version, values['version']) %}
  {%- if dest[0]|int == current[0]|int
     and dest[1]|int - current[1]|int > 1 %}

Unable to upgrade from more than 1 minor version, Node {{ node }} from {{ values['version'] }} to {{ dest_version }}:
  test.fail_without_changes

  {#- If dest_version = 2.1.0-dev and values['version'] = 2.1.0, version_cmp = 0
      but we should not upgrade this node #}
  {%- elif version_cmp == -1
      or (version_cmp == 0 and dest_version != values['version']|string and '-' not in values['version']|string) %}

Node {{ node }} will be ignored, already in {{ values['version'] }} newer than {{ dest_version }}:
  test.succeed_without_changes

  {%- elif dest_version != values['version']|string %}

Node {{ node }} will be upgraded from {{ values['version'] }} to {{ dest_version }}:
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
