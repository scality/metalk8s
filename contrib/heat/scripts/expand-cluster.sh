#!/bin/bash

IFS=','
read -a master_ips <<< "$1"
read -a infra_ips <<< "$2"
read -a worker_ips <<< "$3"
unset IFS

declare -r n_masters=${#master_ips[@]}
declare -r n_infras=${#infra_ips[@]}
declare -r n_workers=${#worker_ips[@]}


export KUBECONFIG=/etc/kubernetes/admin.conf
source /archives/metalk8s/product.txt


mkdir -p /run/metalk8s/manifests

indent() {
  local -r size="$1"
  printf -v prefix "%$(( size - 1 ))s" ""
  echo "${@:2}" | xargs -n 1 echo "${prefix}"
}

print_step() {
  printf $'\n  - %s\n\n' "$@"
}

write_node_manifest() {
  local -r node_name="$1" node_ip="$2"

  IFS=','
  read -a roles <<< "$3"
  read -a taints <<< "$4"
  unset IFS

  local -r manifest_path="/run/metalk8s/manifests/${node_name}.yaml"
  print_step "$manifest_path"

  local role_labels=()
  for role in ${roles[@]}; do
    role_labels+=("'node-role.kubernetes.io/$role: \"\"'")
  done

  local taint_objects=()
  for taint in ${taints[@]}; do
    taint_objects+=("'- key: node-role.kubernetes.io/$taint'")
    taint_objects+=("'  effect: NoSchedule'")
  done

  # `spec` is optional (omitted if no taints)
  local spec_str=""
  if [[ ${#taints[@]} -gt 0 ]]; then
    spec_str+=$'spec:\n  taints:\n'
    spec_str+="$(indent 4 "${taint_objects[@]}")"
  fi

  cat > $manifest_path << EOF
---
apiVersion: v1
kind: Node
metadata:
  name: ${node_name}
  labels:
    metalk8s.scality.com/version: '$VERSION'
$(indent 4 ${role_labels[@]})
  annotations:
    metalk8s.scality.com/ssh-user: centos
    metalk8s.scality.com/ssh-host: ${node_ip}
    metalk8s.scality.com/ssh-key-path: /etc/metalk8s/pki/salt-bootstrap
    metalk8s.scality.com/ssh-sudo: 'true'
${spec_str}
EOF

  cat $manifest_path
}


echo "Writing manifests for master nodes ($n_masters):"
for (( idx=0; idx<$n_masters; idx++ )); do
    write_node_manifest \
      "master-$(( idx + 1 ))" \
      "${master_ips[idx]}" \
      "master,etcd" \
      "master"
done

echo "Writing manifests for infra nodes ($n_infras):"
for (( idx=0; idx<$n_infras; idx++ )); do
    write_node_manifest \
      "infra-$(( idx + 1 ))" \
      "${infra_ips[idx]}" \
      "infra" \
      "infra"
done

echo "Writing manifests for worker nodes ($n_workers):"
for (( idx=0; idx<$n_workers; idx++ )); do
    write_node_manifest \
      "worker-$(( idx + 1 ))" \
      "${worker_ips[idx]}" \
      "node" \
      ""
done


create_node() {
  local -r node_name="$1"
  print_step "creating Node '${node_name}'"
  kubectl apply -f /run/metalk8s/manifests/${node_name}.yaml
}

deploy_node() {
  local -r node_name="$1" async="$2"
  print_step "deploying '${node_name}'"
  kubectl exec -n kube-system -c salt-master salt-master-bootstrap \
      -- salt-run ${async:+"--async"} \
             state.orchestrate metalk8s.orchestrate.deploy_node \
             saltenv=metalk8s-$VERSION \
             "pillar={orchestrate: {node_name: ${node_name}}}"
}

wait_for_nodes() {
  local opts_str="${1:-"--retry 2 --wait 5"}"
  read -a node_names <<< "${@:2}"

  print_step "waiting for Node(s): ${node_names[@]}"

  for node_name in ${node_names[@]}; do
    opts_str+=" -n $node_name"
  done

  python /run/metalk8s/scripts/wait_nodes.py ${opts_str}
}

wait_for_pods() {
  local -r namespace="$1"
  print_step "waiting for Pods stabilization${namespace:+" in $namespace"}"
  /run/metalk8s/scripts/wait_pods_status.sh \
    --sleep-time 5 \
    --stabilization-time 30 \
    --retry 60 \
    --status "Running" \
    ${namespace:+"--namespace $namespace"}
}

echo "Starting deployment of master nodes, sequentially:"
/run/metalk8s/signals/send masters "Started"

for (( idx=0; idx<$n_masters; idx++ )); do
    node_name="master-$(( idx + 1 ))"
    /run/metalk8s/signals/send masters "Deploying '$node_name'"

    create_node "$node_name"

    while true; do
      deploy_node "$node_name"
      # Waiting shouldn't be required, but who knows
      wait_for_nodes "--retry 6 --wait 10" "$node_name" && break
    done

    wait_for_pods "kube-system"
done

# FIXME: this should be handled in the product, but not done in 2.4.2
kubectl exec -n kube-system -c salt-master salt-master-bootstrap \
  -- salt 'master-*' state.sls metalk8s.kubernetes.cni.calico \
     saltenv=metalk8s-2.4.2

wait_for_pods "metalk8s-ingress"

/run/metalk8s/signals/send masters "Completed"

# Store Nodes under async deployment
async_nodes=()

/run/metalk8s/signals/send infra "Started"
/run/metalk8s/signals/send workers "Started"

print_step "ting deployment of infra nodes, concurrently:"
for (( idx=0; idx<$n_infras; idx++ )); do
    node_name="infra-$(( idx + 1 ))"

    create_node "$node_name"
    deploy_node "$node_name" async
    async_nodes+=("$node_name")
done
/run/metalk8s/signals/send infra "Deploying"

echo "Starting deployment of worker nodes, concurrently:"
for (( idx=0; idx<$n_workers; idx++ )); do
    node_name="worker-$(( idx + 1 ))"

    create_node "$node_name"
    deploy_node "$node_name" async
    async_nodes+=("$node_name")
done
/run/metalk8s/signals/send workers "Deploying"

# TODO: poll the Job IDs, watch Salt events...

# Wait for 10 minutes before retrying
wait_for_nodes "--retry 60 --wait 10" ${async_nodes[@]}

if [[ $? != 0 ]]; then
  echo "Something may have gone wrong, trying to redeploy..."

  # NOTE: we don't send a "Completed" signal for infra nodes from here, since
  #       there is a storage provisioning step after
  workers_ready="false"

  while true; do
    waiting_nodes=()
    waiting_infras=()
    waiting_workers=()
    while read -r name; do
      waiting_nodes+=($name)
      [[ ${name%-*} = "infra" ]] && waiting_infras+=($name)
      [[ ${name%-*} = "worker" ]] && waiting_workers+=($name)
    done < <( \
      kubectl get nodes \
        -o jsonpath='{range .items[*]}{@.metadata.name}:{@.status.conditions[?(@.type=="Ready")].status}{"\n"}{end}' \
        | grep "False" | cut -d ":" -f 1
    )

    printf "Redeploying nodes: ${waiting_nodes[@]}\n"

    if [[ ${#waiting_infras[@]} -gt 0 ]]; then
      /run/metalk8s/signals/send infra "Redeploying: ${waiting_infras[@]}"
    fi
    if [[ ${#waiting_workers[@]} -gt 0 ]]; then
      [[ -z "$workers_ready" ]] && \
        /run/metalk8s/signals/send workers "Redeploying: ${waiting_workers[@]}"
    else
      workers_ready="true"
      /run/metalk8s/signals/send workers "Completed"
    fi

    for node in ${waiting_nodes[@]}; do
      deploy_node "$node" async
    done

    wait_for_nodes "--retry 60 --wait 10" ${waiting_nodes[@]} && break
  done
fi

print_step "cluster nodes are now ready."
