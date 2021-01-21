{%- from "metalk8s/map.jinja" import metalk8s with context %}

{%- set dest_version = pillar.metalk8s.cluster_version %}

{#- When downgrading saltenv should be the newest version #}
{%- set nodes_versions = pillar.metalk8s.nodes.values() | map(attribute='version') | list %}
{%- set expected = salt.metalk8s.cmp_sorted(nodes_versions, cmp=salt.pkg.version_cmp, reverse=True) | first %}
{%- if salt.pkg.version_cmp(saltenv | replace('metalk8s-', ''), expected) < 0 %}

Invalid saltenv "{{ saltenv }}" consider using "metalk8s-{{ expected }}":
  test.fail_without_changes

{%- else %}

Correct saltenv "{{ saltenv }}" for downgrade to "{{ dest_version }}":
  test.succeed_without_changes

{%- endif %}

{%- set dest_minor_version, _ = (dest_version|string).rsplit('.', 1) %}
{%- set current_minor_version, _ = (expected|string).rsplit('.', 1) %}

{%- if not metalk8s.downgrade.enabled and dest_minor_version != current_minor_version %}

{% set release_note = 'https://github.com/scality/metalk8s/releases/tag/'
                       ~ current_minor_version ~ '.0' %}

Cannot downgrade from {{ current_minor_version }} to {{ dest_minor_version }}:
  test.fail_without_changes:
    - comment: |-
        Downgrade is not supported, because of etcd version change
        (see {{ release_note }} for details).

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

  {#- Check Kubernetes node object status (should be Ready) #}
  {%- set node_obj = salt.metalk8s_kubernetes.get_object(kind='Node', apiVersion='v1', name=node) %}
  {%- set condition = node_obj['status']['conditions'] | selectattr('type', 'equalto', 'Ready') | first %}

  {%- if condition['status'] != 'True' %}

Node {{ node }} is not Ready - {{ condition['reason'] }}:
  test.fail_without_changes

  {%- else %}

Node {{ node }} is Ready:
  test.succeed_without_changes

  {%- endif %}

  {#- Check Salt communication with this Node #}
Ensure {{ node }} salt-minion running and reachable:
  salt.function:
    - name: test.ping
    - tgt: {{ node }}
    - timeout: 10

{%- endfor %}
