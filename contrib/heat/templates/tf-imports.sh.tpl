#!/bin/bash

TF_IMPORT="terraform import -var-file scality-cloud.tfvars -var-file deployment.tfvars"

echo "Importing SSH keypair..."
$TF_IMPORT openstack_compute_keypair_v2.bastion $keypair
$TF_IMPORT openstack_compute_keypair_v2.local $keypair
echo "Done importing SSH keypair."

echo "Importing Security Groups..."
$TF_IMPORT openstack_networking_secgroup_v2.open_egress $open_egress
$TF_IMPORT openstack_networking_secgroup_v2.restricted_egress $restricted_egress
$TF_IMPORT openstack_networking_secgroup_v2.ingress $ingress
echo "Done importing Security Groups."

echo "Importing Bastion (self)..."
$TF_IMPORT openstack_compute_instance_v2.bastion $(cat /run/cloud-init/.instance-id)
$TF_IMPORT openstack_networking_port_v2.control_plane_bastion $bastion_cp_port
$TF_IMPORT openstack_networking_port_v2.workload_plane_bastion $bastion_wp_port
echo "Done importing Bastion (self)."

echo "Importing Bootstrap..."
$TF_IMPORT openstack_compute_instance_v2.bootstrap $bootstrap_id
$TF_IMPORT openstack_networking_port_v2.control_plane_bootstrap $bootstrap_cp_port
$TF_IMPORT openstack_networking_port_v2.workload_plane_bootstrap $bootstrap_wp_port
echo "Done importing Bootstrap."

import_array() {
    local -r base_addr=$1 values=${@:2}

    count=0
    for value in ${values[@]}; do
        $TF_IMPORT "$base_addr[$count]" "$value"
        (( count++ ))
    done
}

echo "Importing Nodes..."
import_array openstack_compute_instance_v2.nodes $node_ids
import_array openstack_networking_port_v2.control_plane_nodes $node_cp_ports
import_array openstack_networking_port_v2.workload_plane_nodes $node_wp_ports
echo "Done importing Nodes."
