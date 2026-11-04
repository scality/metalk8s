# Include here all states that should be called before upgrading
# NOTE: This state should be called by salt-master using the saltenv of
# the destination version (salt-master should have been upgraded)

{%- from "metalk8s/orchestrate/upgrade/nodes.jinja" import skipped_nodes with context %}
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
{%- set image_cache_nodes = [] %}
{%- for node, node_info in pillar.metalk8s.nodes | dictsort %}
  {%- if node_info.get('version_applied') %}
    {%- do image_cache_nodes.append(node) %}
  {%- endif %}
{%- endfor %}

{%- if image_cache_nodes %}

Wait for the image cache of every node:
  salt.runner:
    - name: metalk8s_checks.image_caches_synced
    - node_list: {{ image_cache_nodes | tojson }}
    - image_caches: {{ image_cache_variants.values() | map(attribute='name') | list | tojson }}
    # NOTE: 20 minutes. A control plane node downloads about 450 MB, all
    # nodes at once from the bootstrap repositories: 6 such nodes take
    # under a minute at 1 Gb/s.
    - retry:
        attempts: 60
        interval: 20
    - require:
      - sls: metalk8s.addons.image-cache-agent.deployed
{%- endif %}

# Clusters bootstrapped before the registry role existed lack this label
# remove this in development/137.0
{%- for node in salt.metalk8s.minions_by_role('bootstrap') %}
Ensure node {{ node }} has the registry role:
  metalk8s_kubernetes.labels_exist:
    - name: {{ node }}
    - apiVersion: v1
    - kind: Node
    - labels:
        node-role.kubernetes.io/registry: ""
    # NOTE: Before the ImageCache resources: the image cache agent does not
    # watch node labels, so a label set after them would only get the
    # registry cache on its next periodic pass.
    - require_in:
      - sls: metalk8s.addons.image-cache-agent.deployed.resources
{%- endfor %}

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
  {%- if image_cache_nodes %}
    - require:
      - salt: Wait for the image cache of every node
  {%- endif %}

{%- else %}

Nothing to do before upgrading:
  test.nop: []

{%- endif %}
