#!/bin/bash

# Note: this script's use openstack client to create snapshot based on value
#       from environment used by terraform and also the environment variable
#       "SNAPSHOT_NAME" which is used to create as name for snapshot
#       Snapshot name is equal to "$SNAPSHOT_NAME-<node_name>" where
#       `<node_name>` is either "bootstrap" or "node-x"

# Global variables
MAX_RETRIES=${MAX_RETRIES:-3}
SLEEP_TIME=${SLEEP_TIME:-5}

# Terraform variables
# Default nodes count is 2 in terraform templates
TF_VAR_nodes_count=${TF_VAR_nodes_count:-2}

get_server_id() {
  local -r jq_query=$1

  terraform output -json ids | jq -r "$jq_query"
}

get_image_status() {
  local -r image_name=$1

  openstack image show "$1" -c status -f value
}

get_server_status() {
  local -r server_id=$1

  openstack server show "$server_id" -c status -f value
}

get_server_task_state() {
  local -r server_id=$1

  openstack server show "$server_id" -c OS-EXT-STS:task_state -f value
}

generate_snapshot() {
  local -r name=$1
  local -r image_name=$2
  local -r server_id=$3

  if [ "$(get_image_status "$image_name" 2> /dev/null)" = "active" ]; then
    echo "$image_name snapshot already exists and 'active'"
    return 0
  fi

  for ((try = 1; try <= MAX_RETRIES; ++try)); do
    echo "Generate snapshot: $image_name (attempts $try/$MAX_RETRIES)"
    openstack server image create --name "$image_name" "$server_id" -f json
    sleep "$SLEEP_TIME"
    # Time to time, image goes in "active" directly even if the
    # upload is not finished, so check both:
    # - wait until task state is different from "image_uploading"
    # - wait until image status is different from "queued"
    while [ "$(get_image_status "$image_name" 2> /dev/null)" = "queued" ] || \
          [ "$(get_server_task_state "$server_id")" = "image_uploading" ]; do
      echo "$image_name is still 'queued' or 'uploading'," \
           "retry in $SLEEP_TIME seconds"
      sleep "$SLEEP_TIME"
    done
    if [ "$(get_image_status "$image_name" 2> /dev/null)" = "active" ]; then
      echo "$image_name snapshot generated and 'active'"
      return 0
    fi
    echo "$image_name snapshot is not 'active' but" \
         "'$(get_image_status "$image_name")' (attempts $try/$MAX_RETRIES)"
  done
  echo "$image_name is still not 'active' after $MAX_RETRIES attempts" 2>&1
  return 1
}

start_on_exit() {
  # On exit start all servers
  for name in "${!SERVER_IDS[@]}"; do
    server_id="${SERVER_IDS[$name]}"
    server_status="$(get_server_status "$server_id" 2>/dev/null)"
    if [ "$server_status" == "SHUTOFF" ]; then
      openstack server start "$server_id"
    fi
  done
}

if ! openstack --version; then
  echo "Openstack client not installed" 2>&1
  exit 1
fi

if test -z "$SNAPSHOT_NAME"; then
  echo "SNAPSHOT_NAME environment variable need to be set" 2>&1
  exit 1
fi

if ! openstack image list > /dev/null; then
  echo "Openstack unreachable" 2>&1
  exit 1
fi

declare -A SERVER_IDS

# Get all server ids from terraform
SERVER_IDS[bootstrap]="$(get_server_id ".bootstrap")"
for i in $(seq 1 "$TF_VAR_nodes_count"); do
  SERVER_IDS[node-$i]="$(get_server_id ".nodes[$((i - 1))]")"
done

# Make sure we re-start all servers when exiting
trap start_on_exit EXIT

# Check that all servers exists and stop it if needed
error=false
for name in "${!SERVER_IDS[@]}"; do
  server_id="${SERVER_IDS[$name]}"
  server_status="$(get_server_status "$server_id" 2>/dev/null)"
  if [ ! "$server_id" ] || [ ! "$server_status" ]; then
    error=true
    echo "Error unable to retrieve status for $name($server_id)" 2>&1
  elif [ "$server_status" != "SHUTOFF" ]; then
    if ! openstack server stop "$server_id"; then
      error=true
      echo "Error unable to shutdown $name($server_id)" 2>&1
    else
      echo "$name($server_id) stopped"
    fi
  fi
done
if $error; then
  exit 1
fi

# List snapshots
echo "${#SERVER_IDS[@]} snapshots need to be generated:"
for name in "${!SERVER_IDS[@]}"; do
  echo -e "\t$SNAPSHOT_NAME-$name from $name(${SERVER_IDS[$name]})"
done

# Generate snapshots
for name in "${!SERVER_IDS[@]}"; do
  generate_snapshot "$name" "$SNAPSHOT_NAME-$name" "${SERVER_IDS[$name]}" \
    || exit 1
done
