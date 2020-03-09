#!/bin/bash

# Retrieve configuration files and hooks from `openstack/heat-templates`
yum install -y git

source /run/metalk8s/scripts/activate-proxy &> /dev/null

mkdir -p /run/metalk8s/heat
cd /run/metalk8s/heat
git clone https://github.com/openstack/heat-templates

# NOTE: unfortunately, no tag to checkout...
cd heat-templates
git checkout 8a20477005a6d9ab1e647597695aefc91328e5ea
cd ..

git clone --branch stable/pike --single-branch \
    https://github.com/openstack/heat-agents

deactivate-proxy &> /dev/null


# Prepare environment
export heat_config_script="$(
    <heat-agents/heat-config/os-refresh-config/configure.d/55-heat-config
)"
export hook_script="$(
    <heat-agents/heat-config-script/install.d/hook-script.py
)"
export heat_config_notify="$(
    <heat-agents/heat-config/bin/heat-config-notify
)"

TEMPLATE_DIR="heat-templates/hot/software-config/boot-config/templates"
export occ_conf="$(
    <${TEMPLATE_DIR}/fragments/os-collect-config.conf
)"
export orc_oac="$(
    <${TEMPLATE_DIR}/fragments/20-os-apply-config
)"

# Run scripts to setup Heat config agent
bash ${TEMPLATE_DIR}/fragments/install_config_agent_rdo.sh
bash ${TEMPLATE_DIR}/fragments/configure_config_agent.sh
bash ${TEMPLATE_DIR}/fragments/start_config_agent.sh
