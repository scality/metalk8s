#!jinja | metalk8s_kubernetes

{%- from "metalk8s/map.jinja" import coredns with context %}

apiVersion: v1
kind: ConfigMap
metadata:
  name: npd-wp-scripts
  namespace: metalk8s-monitoring
data:
  check-wp.sh: |
    #!/bin/bash
    set -u

    # Peers are the other NPD pods, published by the headless Service
    SERVICE="${WP_SERVICE:-node-problem-detector.metalk8s-monitoring.svc.{{ coredns.cluster_domain }}.}"
    PORT="${WP_PORT:-20257}"                          # NPD exporter port, a TCP connect there is inert
    CT="${WP_CONNECT_TIMEOUT:-2}"                     # per-peer TCP connect timeout (seconds)
    SELF="${POD_IP:-}"                                # this pod's IP (Downward API)
    CACHE="${WP_PEERS_CACHE:-/run/wp-monitor/peers}"  # last resolved peer list
    # An attempt costs up to 2s plus 1s of backoff, raising it means raising the plugin timeout
    ATTEMPTS="${WP_RESOLVE_ATTEMPTS:-2}"

    # Keep resolution short, the script must own its timing to always control its exit code
    export RES_OPTIONS="timeout:1 attempts:1"

    # Config sanity -> Unknown (exit 2): never risk a wrong verdict
    [ -n "$SELF" ] || { echo "POD_IP not set (cannot exclude self)"; exit 2; }

    addrs=""
    attempt=0
    while [ -z "$addrs" ] && [ "$attempt" -lt "$ATTEMPTS" ]; do
      attempt=$((attempt+1))
      addrs=$(timeout 2 getent hosts "$SERVICE" | sed 's/[[:space:]].*//' | tr '\n' ' ')
      [ -n "$addrs" ] || [ "$attempt" = "$ATTEMPTS" ] || sleep 1
    done

    if [ -z "$addrs" ]; then
      # Cluster DNS runs on the pod network too, judge the peers we last knew rather
      # than report a problem on every peer of the node hosting CoreDNS
      addrs=$(cat "$CACHE" 2>/dev/null)
      [ -n "$addrs" ] || { echo "cannot resolve $SERVICE and no known peers"; exit 2; }
    fi

    peers=""
    checked=0
    for ip in $addrs; do
      [ "$ip" = "$SELF" ] && continue
      peers="$peers $ip"
      checked=$((checked+1))
    done

    # Endpoints come back one pod at a time, caching an answer holding only ourselves
    # would read as "no peers to check" for as long as DNS stays down
    if [ "$checked" -gt 0 ]; then
      { echo "$peers" > "$CACHE"; } 2>/dev/null || true
    fi

    # No peers (single-node cluster) -> nothing to judge -> healthy
    [ "$checked" -gt 0 ] || { echo "pod network ok: no peers to check"; exit 0; }

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
      echo "pod network unreachable: reached $reachable/$checked peers (< majority)"
      exit 1
    fi

    echo "pod network ok: reached $reachable/$checked peers"
    exit 0
