# Include here all states that should be called before upgrading
# NOTE: This state should be called by salt-master using the saltenv of
# the destination version (salt-master should have been upgraded)

{%- from "metalk8s/orchestrate/upgrade/nodes.jinja" import dest_version, skipped_nodes with context %}
{%- from "metalk8s/image-cache/variants.jinja" import image_cache_variants with context %}

include:
  - metalk8s.addons.metalk8s-operator.deployed
  - metalk8s.addons.prometheus-operator.pre-upgrade
  # NOTE: The whole addon and not only the resources: the version we upgrade
  # from has no image cache agent.
  - metalk8s.addons.image-cache-agent.deployed

{#- Wait for the agent to cache the images of this version on every node, so
    that no node runs this version without them. Here and not before each node
    is deployed: etcd, the API servers and the engines of the bootstrap node are
    upgraded first. Only the resources of this version: one of an older version
    stuck on a node must not hold the upgrade. A node never deployed runs no
    agent, and `deploy_node` fills its cache. #}
{%- set image_cache_waits = [] %}
{%- for node, node_info in pillar.metalk8s.nodes | dictsort %}
  {%- if node_info.get('version_applied') %}

Wait for the image cache of {{ node }}:
  test.configurable_test_state:
    - changes: False
    - result: __slot__:salt:metalk8s_kubernetes.check_image_caches_synced(node="{{ node }}", names="{{ image_cache_variants.values() | map(attribute='name') | join(',') }}")
    - comment: The image cache of {{ node }} is synced
    # NOTE: 20 minutes, for a control plane node pulling about 1.2 GB. The
    # agent pulls on every node at once, so the nodes after the first one
    # are mostly done when their turn comes.
    - retry:
        attempts: 60
        interval: 20
    - require:
      - sls: metalk8s.addons.image-cache-agent.deployed
  {%- if image_cache_waits %}
      # NOTE: One node after the other, so that a cluster wide failure, such
      # as a registry down, stops at the first node instead of waiting the
      # full budget on each one.
      - test: {{ image_cache_waits | last }}
  {%- endif %}

  {%- do image_cache_waits.append('Wait for the image cache of ' ~ node) %}
  {%- endif %}
{%- endfor %}

{%- if image_cache_waits %}

{#- One explanation for every wait, which names no node: a failed wait fails
    the ones after it on a requisite, and they never checked their node. #}
Explain the image cache not being synced:
  test.configurable_test_state:
    - changes: False
    - result: False
    - comment: >-
        The image cache agent did not cache the images of {{ dest_version }}
        on every node in time, so the upgrade stopped before upgrading
        anything. The error above names the node and the resources still
        pending. Check the image-cache-agent Pod on that node in the
        metalk8s-image-cache namespace, then run the upgrade again.
    - onfail_any:
  {%- for wait in image_cache_waits %}
      - test: {{ wait }}
  {%- endfor %}
{%- endif %}

{%- set cp_nodes = salt.metalk8s.minions_by_role('master') %}
{#- A node the upgrade skips is never deployed, so nothing would uncordon it
    after this drain. On a single-node cluster, that leaves the
    metalk8s-operator with nowhere to run, and the upgrade waits on it
    forever. #}
{%- if cp_nodes|length == 1 and cp_nodes[0] not in skipped_nodes %}

# NOTE: Due to a "bug" in kubelet that affect static pod deployment when
# APIServer is down (See: https://github.com/kubernetes/kubernetes/issues/103658)
# When all APIServer are down, we want to have as less pod as possible running.
# That's why, when running in single master node cluster, we first drain the node so
# that we do not face any issue when upgrading APIServer, etcd or APIServer proxy
# NOTE2: Since we may not be able to properly drain a node when running in single
# node cluster, we use "best effort" so that we try to evict as many pods as possible

Best effort drain for {{ cp_nodes[0] }} before upgrade:
  metalk8s_drain.node_drained:
    - name: {{ cp_nodes[0] }}
    - ignore_daemonset: True
    - delete_local_data: True
    - force: True
    - best_effort: True
  {%- if image_cache_waits %}
    - require:
    {%- for wait in image_cache_waits %}
      - test: {{ wait }}
    {%- endfor %}
  {%- endif %}

{%- else %}

Nothing to do before upgrading:
  test.nop: []

{%- endif %}
