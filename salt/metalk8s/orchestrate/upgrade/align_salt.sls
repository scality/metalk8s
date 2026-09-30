{#- Rendered on the salt-master, so the versions are read through the
    `metalk8s_saltutil.minions_salt_version` runner, as `mine.get` returns
    nothing here. #}
{%- from "metalk8s/map.jinja" import repo with context %}

{%- set dest_version = pillar.metalk8s.cluster_version %}
{%- set salt_minion_version = repo.packages.get('salt-minion', {}).get('version') %}
{%- set ca_minion = salt.pillar.get("metalk8s:ca:minion", none) %}

{%- macro minion_salt_version(minion) %}
  {%- set versions = salt.saltutil.runner(
          'metalk8s_saltutil.minions_salt_version', tgt=minion
      ) %}
  {%- if versions is not mapping or versions.get(minion) is not string %}
    {{ raise(
           "Unable to get the salt-minion version of '" ~ minion ~ "': "
           ~ versions | string
       ) }}
  {%- endif %}
  {{- versions[minion] }}
{%- endmacro %}

{%- set lagging_nodes = [] %}
{%- if salt_minion_version and ca_minion %}
  {%- set ca_version = minion_salt_version(ca_minion) | trim %}
  {%- if ca_version == salt_minion_version or ca_version.startswith(salt_minion_version ~ "-") %}
    {%- set control_plane_nodes = (
            salt.metalk8s.minions_by_role('etcd')
            + salt.metalk8s.minions_by_role('master')
        ) | unique | sort %}
    {%- for node in control_plane_nodes if node != ca_minion %}
      {%- set version = minion_salt_version(node) | trim %}
      {%- if version != salt_minion_version and not version.startswith(salt_minion_version ~ "-") %}
        {%- do lagging_nodes.append(node) %}
      {%- endif %}
    {%- endfor %}
  {%- endif %}
{%- endif %}

{%- if not lagging_nodes %}

No salt-minion to align:
  test.succeed_without_changes: []

{%- endif %}

{%- for node in lagging_nodes %}

Reconfigure salt-minion on {{ node }}:
  salt.state:
    - tgt: {{ node }}
    - saltenv: metalk8s-{{ dest_version }}
    - sls:
      - metalk8s.salt.minion.configured
    # NOTE: This state may restart salt-minion service (config changes) and
    # launch a detached salt-minion package upgrade/downgrade, so it may take
    # time to answer salt-master job query, so increase timeout for this
    # specific state
    - timeout: 300
  {%- if loop.previtem is defined %}
    - require:
      - salt: Wait minion {{ loop.previtem }} available
  {%- endif %}

Wait minion {{ node }} available:
  test.configurable_test_state:
    - changes: False
    - result: __slot__:salt:test.sleep(10)
    - comment: Wait a bit for 'salt-minion' to restart before checking status
    - onchanges:
      - salt: Reconfigure salt-minion on {{ node }}
  salt.runner:
    - name: metalk8s_saltutil.wait_minions
    - tgt: {{ node }}
    - expected_salt_version: {{ salt_minion_version }}
    - retry:
        attempts: 5
        interval: 30
    - require:
      - test: Wait minion {{ node }} available

{%- endfor %}
