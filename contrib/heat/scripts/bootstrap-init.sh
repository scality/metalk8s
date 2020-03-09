#!/bin/bash -x

log() {
  local -r message="$@"

  echo "$message" | tee -a /run/metalk8s/install.log
}


log "Started -" `date`

declare -r offline="<%offline%>"
declare -r bastion_ip="<%bastion_ip%>"
declare -r bastion_proxy_port="<%bastion_proxy_port%>"
declare -r iso_url="<%iso_url%>"
declare -r iso_user="<%iso_user%>"
declare -r iso_pass="<%iso_pass%>"
declare -r bootstrap_private_key="<%bootstrap_private_key%>"
declare -r bootstrap_public_key="<%bootstrap_public_key%>"
declare -r master_ips="<%master_ips%>"
declare -r infra_ips="<%infra_ips%>"
declare -r worker_ips="<%worker_ips%>"


# Proxy setup


/run/metalk8s/signals/send init "Initialized"
/run/metalk8s/signals/send bootstrap "Preparing"

log "Retrieving MetalK8s ISO..."

mkdir -p /archives/metalk8s

[[ -z "$iso_user" ]] && user_opt="" || user_opt="-u $iso_user:$iso_pass"

source /run/metalk8s/scripts/activate-proxy &> /dev/null
curl --retry 3 -o /archives/metalk8s/metalk8s.iso $user_opt $iso_url \
  | tee -a /run/metalk8s/install.log
deactivate-proxy &> /dev/null

log "  done."


log "Extracting product info from ISO file for later use..."

yum install -y genisoimage
isoinfo -x /PRODUCT.TXT\;1 -i /archives/metalk8s/metalk8s.iso \
  > /archives/metalk8s/product.txt

log "  done."

/run/metalk8s/signals/send bootstrap "Configuring"

log "Configuring Bootstrap before installation..."

/run/metalk8s/scripts/configure-bootstrap.sh \
  "$bootstrap_private_key" "$bootstrap_public_key" | tee -a /run/metalk8s/install.log

log "  done."


/run/metalk8s/signals/send bootstrap "Installing"

log "Installing Bootstrap..."

/run/metalk8s/scripts/install-bootstrap.sh | tee -a /run/metalk8s/install.log

log "  done."

/run/metalk8s/signals/send bootstrap "Completed"


export KUBECONFIG=/etc/kubernetes/admin.conf

log "Expanding the cluster..."

/run/metalk8s/scripts/expand-cluster.sh \
  "$master_ips" "$infra_ips" "$worker_ips" \
  | tee -a /run/metalk8s/install.log

log "  done."


/run/metalk8s/signals/send infra "Provisioning storage"

log "Configuring 'infra' services..."

/run/metalk8s/scripts/setup-infra.sh | tee -a /run/metalk8s/install.log

log "  done."

/run/metalk8s/signals/send infra "Completed"


log "Waiting for complete cluster stabilization..."

/run/metalk8s/scripts/wait_pods_status.sh \
  --sleep-time 5 \
  --stabilization-time 30 \
  --retry 60 \
  --status "Running" | tee -a /run/metalk8s/install.log

log "  done."


log "Finished -" `date`

/run/metalk8s/signals/send "complete" "Completed"
