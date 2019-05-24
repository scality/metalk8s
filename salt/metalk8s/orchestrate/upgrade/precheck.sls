{%- set dest_version = pillar.orchestrate.dest_version %}
{%- set saltenv_ver = {'current': saltenv.split('-')[1], 'expected': dest_version} %}

{%- set dest = (dest_version|string).split('.') %}
{%- for node, values in pillar.metalk8s.nodes.items() %}

  {#- 1 = Upgrade, -1 = Downgrade, 0 = Correct version #}
  {%- set upgrade = salt.pkg.version_cmp(dest_version, values['version']) %}

  {%- if upgrade == 1 %}
    {%- set action = "upgrade" %}
  {%- elif upgrade == -1 %}
    {%- set action = "downgrade" %}
  {%- endif %}

  {%- if salt.pkg.version_cmp(saltenv_ver['expected'], values['version']) == -1 %}
    {%- do saltenv_ver.update({'expected': values['version']}) %}
  {%- endif %}

  {#- As we don't know how many minor version we do before a new major,
      never block upgrade between major version #}
  {%- set current = (values['version']|string).split('.') %}
  {%- if dest[0]|int == current[0]|int
     and (dest[1]|int - current[1]|int)|abs > 1 %}

Unable to {{ action }} from more than 1 version, Node {{ node }} from {{ values['version'] }} to {{ dest_version }}:
  test.fail_without_changes

  {%- elif upgrade != 0 %}

Node {{ node }} will be {{ action }}d from {{ values['version'] }} to {{ dest_version }}:
  test.succeed_without_changes

  {%- else %}

Node {{ node }} already in version {{ dest_version }}:
  test.succeed_without_changes

  {%- endif %}

{%- endfor %}

{#- We need to use the newest saltenv available #}
{%- if salt.pkg.version_cmp(saltenv_ver['current'], saltenv_ver['expected']) != 0 %}

Invalid saltenv "{{ saltenv }}" consider using "metalk8s-{{ saltenv_ver['expected'] }}":
  test.fail_without_changes

{%- endif %}
