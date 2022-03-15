# Include here all states that should be called before upgrading
# NOTE: This state should be called by salt-master using the saltenv of
# the destination version (salt-master should have been upgraded)

# In 2.10.x we deploy an invalid PodDisruptionBudget with minAvailable set to 0
# this PDB may break the upgrade as the Ingress Controller does not work properly
# during this upgrade
# NOTE: It only happen when the Control Plane Ingress is deployed as a Deployment
# Since it's a really specific case we just delete this PDB so that we are able to
# upgrade in this case
# NOTE: We do no longer deploy this PDB in 2.11+
# NOTE: It should be removed in `development/123.0`
Ensure the Control Plane Ingress PodDisruptionBudget does not exists:
  metalk8s_kubernetes.object_absent:
    - apiVersion: policy/v1
    - kind: PodDisruptionBudget
    - name: ingress-nginx-control-plane-controller
    - namespace: metalk8s-ingress

{%- set cp_nodes = salt.metalk8s.minions_by_role('master') %}
{%- if cp_nodes|length == 1 %}

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

{%- else %}

Nothing to do before upgrading:
  test.nop: []

{%- endif %}
