# Bring the salt-minions that talk to the CA before their own deployment to
# the version the CA minion already runs.
# NOTE: This state should be called by salt-master using the saltenv of
# the destination version (salt-master should have been upgraded)

{#- A minion gets its certificates signed by the CA minion through
    `x509.sign_remote_certificate`, and the `x509` (Salt < 3006) and `x509_v2`
    modules do not call it with the same arguments, so a minion and the CA
    minion must run the same one. A fresh upgrade keeps them aligned: every
    minion stays on its version until its turn in `metalk8s.orchestrate.upgrade`,
    whose loop starts with the CA minion. An upgrade interrupted inside the loop,
    once the CA minion moved on, is resumed from the top, and the steps before
    the loop then have lagging minions ask a CA they cannot talk to. So when the
    CA minion already runs the destination version, upgrade every other minion
    first, the way `metalk8s.orchestrate.deploy_node` does. #}

{%- from "metalk8s/map.jinja" import repo with context %}

{%- set dest_salt_version = repo.packages.get('salt-minion', {}).get('version') %}
{%- set ca_minion = pillar.metalk8s.ca.minion %}
{%- set other_nodes = pillar.metalk8s.nodes.keys() | reject('equalto', ca_minion)
                      | sort %}

{#- Retry like `metalk8s.orchestrate.bootstrap`, since the salt-master just
    restarted #}
{%- set max_try = 5 %}
{%- set installed = {} %}
{%- set unanswered = [] %}

{%- macro query_version(node) %}
  {%- for _ in range(max_try) %}
    {%- set res = salt.saltutil.cmd(tgt=node, fun='pkg.version', arg=['salt-minion'])
                  .get(node, {}) %}
    {#- `ret` holds the error text when the function raised. Otherwise it is
        the package version with its release, e.g. "3006.27-0" for "3006.27" #}
    {%- if res.get('retcode', 0) == 0 and res.get('ret') is string and res.ret %}
      {%- do installed.update({node: res.ret.split('-')[0]}) %}
      {%- break %}
    {%- endif %}
  {%- endfor %}
  {%- if node not in installed %}
    {%- do unanswered.append(node) %}
  {%- endif %}
{%- endmacro %}

{#- On a fresh upgrade that changes the Salt version, the CA minion still runs
    the source one, so this step costs a single query #}
{%- do query_version(ca_minion) %}
{%- if dest_salt_version and installed.get(ca_minion) == dest_salt_version %}
  {%- for node in other_nodes %}
    {%- do query_version(node) %}
  {%- endfor %}
{%- endif %}

{%- set lagging = [] %}
{#- Only an older minion is lagging. A newer one is left alone, since this step
    must not downgrade a node the upgrade itself would skip. #}
{%- for node in other_nodes if node in installed %}
  {%- if salt.pkg.version_cmp(installed[node], dest_salt_version) == -1 %}
    {%- do lagging.append(node) %}
  {%- endif %}
{%- endfor %}

{#- A minion that does not answer cannot be told apart from a lagging one, and
    a later step would then fail on it with an error that says nothing about
    versions #}
{%- if unanswered %}

Get the salt-minion version of the nodes the CA signs for:
  test.fail_without_changes:
    - comment: >-
        No salt-minion version from {{ unanswered | join(', ') }}, cannot tell
        whether they run the same x509 module as the CA minion
    - failhard: True

{%- elif lagging %}

  {%- for node in lagging %}

Sync {{ node }} minion before its salt-minion upgrade:
  salt.function:
    - name: saltutil.sync_all
    - tgt: {{ node }}
    - kwarg:
        saltenv: {{ saltenv }}
    {%- if loop.previtem is defined %}
    - require:
      - salt: Wait for salt-minion {{ dest_salt_version }} on {{ loop.previtem }}
    {%- endif %}

Refresh {{ node }} grains before its salt-minion upgrade:
  salt.function:
    - name: saltutil.refresh_grains
    - tgt: {{ node }}
    - timeout: 120
    - require:
      - salt: Sync {{ node }} minion before its salt-minion upgrade

Check pillar on {{ node }} before its salt-minion upgrade:
  salt.function:
    - name: metalk8s.check_pillar_keys
    - tgt: {{ node }}
    - kwarg:
        keys:
          - metalk8s.endpoints.salt-master
          - metalk8s.endpoints.repositories
        # We cannot raise when using `salt.function` as we need to return
        # `False` to have a failed state
        # https://github.com/saltstack/salt/issues/55503
        raise_error: False
    - retry:
        attempts: 5
    - require:
      - salt: Refresh {{ node }} grains before its salt-minion upgrade

Reconfigure salt-minion on {{ node }}:
  salt.state:
    - tgt: {{ node }}
    - saltenv: {{ saltenv }}
    - sls:
      - metalk8s.salt.minion.configured
    # NOTE: This state launches a detached salt-minion package upgrade, which
    # restarts the minion, so give it time to answer the job query
    - timeout: 300
    - require:
      - salt: Check pillar on {{ node }} before its salt-minion upgrade

Wait for salt-minion {{ dest_salt_version }} on {{ node }}:
  salt.runner:
    - name: metalk8s_saltutil.wait_minions
    - tgt: {{ node }}
    - expected_salt_version: {{ dest_salt_version }}
    # Same budget as in `metalk8s.orchestrate.deploy_node`: the reconnection
    # to the publish channel can take a few minutes after the restart
    - retry:
        attempts: 5
        interval: 30
    - require:
      - salt: Reconfigure salt-minion on {{ node }}

  {%- endfor %}

{%- else %}

Nothing to align with the CA minion:
  test.succeed_without_changes

{%- endif %}
