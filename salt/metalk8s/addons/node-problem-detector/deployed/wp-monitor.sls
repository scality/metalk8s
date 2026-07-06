#!jinja | metalk8s_kubernetes

{#- Mine can hold stale entries after node removal; keep only nodes still in the pillar #}
{%- set wp_mine = salt.saltutil.runner('mine.get', tgt='*', fun='workload_plane_ip') %}
{%- set peers = {} %}
{%- for node in pillar.metalk8s.nodes.keys() | sort %}
  {%- if node in wp_mine %}
    {%- do peers.update({node: wp_mine[node]}) %}
  {%- endif %}
{%- endfor %}
{#- An empty map is safe: the probe treats "no peers" as healthy #}

apiVersion: v1
kind: ConfigMap
metadata:
  name: npd-wp-peers
  namespace: metalk8s-monitoring
data:
  peers: |
    # nodeName   WP IP
{%- for name, ip in peers | dictsort %}
    {{ name }} {{ ip }}
{%- endfor %}
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: npd-wp-scripts
  namespace: metalk8s-monitoring
data:
  check-wp.sh: |
    #!/bin/bash
    set -u

    PEERS_FILE="${WP_PEERS_FILE:-/config-wp/peers}"   # mounted ConfigMap (nodeName -> WP IP)
    PORT="${WP_PORT:-179}"                            # Calico BGP port, already listening on the WP
    CT="${WP_CONNECT_TIMEOUT:-2}"                     # per-peer TCP connect timeout (seconds)
    SELF="${NODE_NAME:-}"                             # this node's name (Downward API)

    # Config sanity -> Unknown (exit 2): never risk a wrong verdict
    [ -n "$SELF" ]       || { echo "NODE_NAME not set (cannot exclude self)"; exit 2; }
    [ -r "$PEERS_FILE" ] || { echo "peers file $PEERS_FILE not readable";      exit 2; }

    # Build the peer list: skip comments / blanks / malformed lines, exclude self
    peers=""
    checked=0
    while read -r name ip _; do
      [ -n "${name:-}" ] || continue
      case "$name" in \#*) continue ;; esac
      [ -n "${ip:-}" ]   || continue
      [ "$name" = "$SELF" ] && continue
      peers="$peers $ip"
      checked=$((checked+1))
    done < "$PEERS_FILE"

    # No peers (single-node cluster, or only self listed) -> nothing to judge -> healthy
    [ "$checked" -gt 0 ] || { echo "WP ok: no peers to check"; exit 0; }

    # Probe every peer in parallel (total time ~ one timeout, regardless of cluster size)
    pids=""
    for ip in $peers; do
      timeout "$CT" bash -c ": </dev/tcp/$ip/$PORT" 2>/dev/null &
      pids="$pids $!"
    done
    reachable=0
    for pid in $pids; do
      wait "$pid" && reachable=$((reachable+1))
    done

    # Majority quorum: isolated if we reached fewer than half of the peers
    if [ $((reachable * 2)) -lt "$checked" ]; then
      echo "WP unreachable: reached $reachable/$checked peers (< majority)"
      exit 1
    fi

    echo "WP ok: reached $reachable/$checked peers"
    exit 0
