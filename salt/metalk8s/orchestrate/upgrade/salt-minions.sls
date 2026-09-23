# Bring the salt-minions that talk to the CA before their own deployment to
# the version the CA minion already runs.
# NOTE: This state should be called by salt-master using the saltenv of
# the destination version (salt-master should have been upgraded)

{#- A minion gets its certificates signed by the CA minion through
    `x509.sign_remote_certificate`, and the `x509` (Salt < 3006) and `x509_v2`
    modules do not call it with the same arguments, so a minion and the CA
    minion must run the same one. A fresh upgrade keeps them aligned: every
    minion stays on its version until its turn in `metalk8s.orchestrate.upgrade`,
    whose loop starts with the CA minion, and the etcd and API server steps run
    before that loop. An upgrade interrupted inside the loop, once the CA minion
    moved on, is resumed from the top, and the etcd step then has lagging
    minions ask a CA they cannot talk to. So when the CA minion already runs the
    destination version, upgrade the etcd and master minions first, the way
    `metalk8s.orchestrate.deploy_node` does. The other nodes only talk to the CA
    during their own deployment, which upgrades their salt-minion first. #}

{%- from "metalk8s/map.jinja" import repo with context %}

{%- set dest_salt_version = repo.packages.get('salt-minion', {}).get('version') %}
{%- set ca_minion = pillar.metalk8s.ca.minion %}
{%- set early_nodes = (salt.metalk8s.minions_by_role('etcd')
                       + salt.metalk8s.minions_by_role('master'))
                      | unique | reject('equalto', ca_minion) | sort %}

{#- The CA minion is queried first, and the others only when it already runs
    the destination version: on a fresh upgrade this step then costs a single
    query. Retry like `metalk8s.orchestrate.bootstrap`, since the salt-master
    just restarted. #}
{%- set max_try = 5 %}
{%- set installed = {} %}
{%- set unanswered = [] %}
{%- for node in [ca_minion] + early_nodes %}
  {%- for _ in range(max_try) %}
    {%- set res = salt.saltutil.cmd(tgt=node, fun='pkg.version', arg=['salt-minion'])
                  .get(node, {}) %}
    {#- `ret` holds the error text when the function raised #}
    {%- if res.get('retcode', 0) == 0 and res.get('ret') is string and res.ret %}
      {%- do installed.update({node: res.ret}) %}
      {%- break %}
    {%- endif %}
  {%- endfor %}
  {%- if node not in installed %}
    {%- do unanswered.append(node) %}
  {%- endif %}
  {#- `pkg.version` gives the package version with its release, e.g.
      "3006.27-0" for "3006.27" #}
  {%- if node == ca_minion
      and not (dest_salt_version
               and (installed.get(node) == dest_salt_version
                    or installed.get(node, '').startswith(dest_salt_version ~ '-'))) %}
    {%- break %}
  {%- endif %}
{%- endfor %}

{%- set lagging = [] %}
{%- for node in early_nodes if node in installed %}
  {%- if not (installed[node] == dest_salt_version
              or installed[node].startswith(dest_salt_version ~ '-')) %}
    {%- do lagging.append(node) %}
  {%- endif %}
{%- endfor %}

{#- A minion that does not answer cannot be told apart from a lagging one, and
    the etcd step would then fail on it with an error that says nothing about
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
