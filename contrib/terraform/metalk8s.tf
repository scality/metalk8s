locals {
  metalk8s_iso = {
    mode        = var.metalk8s_iso.mode,
    source      = var.metalk8s_iso.source,
    destination = var.metalk8s_iso.destination,
    mountpoint  = var.metalk8s_iso.mountpoint,
  }

  bootstraps = local.heat.enabled ? {} : {
    for c_name, cluster in var.metalk8s_clusters :
    c_name => {
      machine_id = "${cluster.bootstrap.group}-1"
      access_ip = (
        local.machines_info[cluster.bootstrap.group]
        ["${cluster.bootstrap.group}-1"].access_ip
      ),
      access_user  = local.machine_groups[cluster.bootstrap.group].user,
      cluster_info = cluster,
      roles = lookup(
        cluster.bootstrap, "roles",
        ["bootstrap", "master", "etcd", "infra"]
      ),
      taints = lookup(cluster.bootstrap, "taints", ["bootstrap", "infra"]),
    }
  }

  all_nodes = local.heat.enabled ? {} : {
    for c_name, cluster in var.metalk8s_clusters :
    c_name => flatten([
      for g_name, group in cluster.node_groups :
      [
        for idx in range(local.machine_groups[group.group].count) :
        {
          # Node names depend on the node_group name in the cluster definition
          # while machine names are based on the machine_group name, and those
          # may differ.
          name = "${g_name}-${idx + 1}",
          access_ip = (
            local.machines_info[group.group]["${group.group}-${idx + 1}"].access_ip
          ),
          access_user = local.machine_groups[group.group].user,
          roles       = group.roles,
          taints      = group.taints,
        }
      ]
    ])
  }
}

resource "null_resource" "upload_local_iso" {
  for_each = (
    ! local.heat.enabled &&
    local.metalk8s_iso.mode == "local" && local.metalk8s_iso.source != ""
  ) ? local.bootstraps : {}

  triggers = {
    bootstrap_id = openstack_compute_instance_v2.machines[each.value.machine_id].id,
  }

  connection {
    host        = each.value.access_ip
    type        = "ssh"
    user        = each.value.access_user
    private_key = local.access_private_key
  }

  provisioner "remote-exec" {
    inline = ["sudo mkdir -p ${dirname(local.metalk8s_iso.destination)}"]
  }

  provisioner "file" {
    source      = local.metalk8s_iso.source
    destination = local.metalk8s_iso.destination
  }
}

resource "null_resource" "download_remote_iso" {
  for_each = (
    ! local.heat.enabled &&
    local.metalk8s_iso.mode == "remote" && local.metalk8s_iso.source != ""
  ) ? local.bootstraps : {}

  triggers = {
    bootstrap_id      = openstack_compute_instance_v2.machines[each.value.machine_id].id,
    bastion_access_ip = local.bastion_info.access_ip,
  }

  connection {
    host        = each.value.access_ip
    type        = "ssh"
    user        = each.value.access_user
    private_key = local.access_private_key
  }

  provisioner "remote-exec" {
    inline = [
      "sudo mkdir -p ${dirname(local.metalk8s_iso.destination)}",
      join(" ", compact([
        "sudo env",
        local.bastion.enabled
        ? join("", [
          "http_proxy=http://${local.bastion_info.access_ip}",
          ":${local.bastion.proxy_port} ",
          "https_proxy=http://${local.bastion_info.access_ip}",
          ":${local.bastion.proxy_port}",
        ])
        : "",
        "curl -o ${local.metalk8s_iso.destination} ${local.metalk8s_iso.source}",
      ])),
    ]
  }
}

resource "null_resource" "configure_bootstrap" {
  for_each = local.heat.enabled ? {} : local.bootstraps

  triggers = {
    bootstrap_id      = openstack_compute_instance_v2.machines[each.value.machine_id].id,
    bastion_access_ip = local.bastion_info.access_ip,
  }

  connection {
    host        = each.value.access_ip
    type        = "ssh"
    user        = each.value.access_user
    private_key = local.access_private_key
  }

  provisioner "remote-exec" {
    inline = [
      # Pre-seed minion ID
      "sudo mkdir -p /etc/salt",
      "sudo bash -c 'echo \"bootstrap\" > /etc/salt/minion_id'",
      # Write SSH identity for Salt master
      "sudo mkdir -p /etc/metalk8s/pki",
      "echo '${
        openstack_compute_keypair_v2.bootstraps[each.key].private_key
      }' | sudo tee /etc/metalk8s/pki/salt-bootstrap",
      "echo '${
        openstack_compute_keypair_v2.bootstraps[each.key].public_key
      }' | sudo tee /etc/metalk8s/pki/salt-bootstrap.pub",
      "chmod 600 /etc/metalk8s/pki/salt-bootstrap*",
      join(" ", [ # authorize for self
        "sudo cat /etc/metalk8s/pki/salt-bootstrap.pub",
        ">> /home/${each.value.access_user}/.ssh/authorized_keys",
      ]),
      # Write BootstrapConfiguration
      "echo '${
        templatefile("${path.root}/templates/bootstrap.yaml.tpl", {
          control_plane_cidr = (
            each.value.cluster_info.networks.control_plane == "__access__"
            ? data.openstack_networking_subnet_v2.access_subnet.cidr
            : local.private_subnets[
              each.value.cluster_info.networks.control_plane
            ].cidr
          ),
          workload_plane_cidr = (
            each.value.cluster_info.networks.workload_plane == "__access__"
            ? data.openstack_networking_subnet_v2.access_subnet.cidr
            : local.private_subnets[
              each.value.cluster_info.networks.workload_plane
            ].cidr
          ),
          ca_minion = "bootstrap",
          archives  = [local.metalk8s_iso.destination],
        })
      }' | sudo tee /etc/metalk8s/bootstrap.yaml",
      # Prepare directories
      "sudo mkdir -p /run/metalk8s/scripts",
      "sudo mkdir -p /run/metalk8s/manifests",
    ]
  }
}

resource "null_resource" "run_bootstrap" {
  for_each = local.heat.enabled ? {} : local.bootstraps

  triggers = {
    iso_provisioning_id = join(",", compact([
      lookup(null_resource.upload_local_iso, each.key, { id = "" }).id,
      lookup(null_resource.download_remote_iso, each.key, { id = "" }).id,
    ])),
    configure_bootstrap_id = null_resource.configure_bootstrap[each.key].id
    bootstrap_id           = openstack_compute_instance_v2.machines[each.value.machine_id].id,
  }

  connection {
    host        = each.value.access_ip
    type        = "ssh"
    user        = each.value.access_user
    private_key = local.access_private_key
  }

  provisioner "remote-exec" {
    inline = [
      "sudo mkdir -p ${local.metalk8s_iso.mountpoint}",
      join(" ", [
        "sudo mount -o loop",
        local.metalk8s_iso.destination,
        local.metalk8s_iso.mountpoint,
      ]),
      "sudo ${local.metalk8s_iso.mountpoint}/bootstrap.sh --verbose",
      # Store cluster version for later use in scripts
      join(" ", [
        "sudo salt-call pillar.get metalk8s:cluster_version --out txt",
        "| cut -d ' ' -f 2 | sudo tee /run/metalk8s/.cluster-version",
      ]),
    ]
  }

  provisioner "file" {
    destination = "/tmp/apply_roles_taints.py"
    content     = file("${path.root}/scripts/apply_roles_taints.py")
  }

  provisioner "remote-exec" {
    inline = [
      "sudo cp /tmp/apply_roles_taints.py /run/metalk8s/scripts/",
      join(" ", [
        "sudo python /run/metalk8s/scripts/apply_roles_taints.py",
        "bootstrap",
        "--roles ${join(" ", each.value.roles)}",
        "--taints ${join(" ", each.value.taints)}",
      ]),
    ]
  }
}

resource "null_resource" "share_bootstrap_keys" {
  for_each = local.heat.enabled ? {} : {
    for item in flatten([
      for c_name, machines in local.all_nodes :
      [for machine in machines : { machine = machine, cluster = c_name }]
    ]) :
    "${item.machine.name}" => item
  }

  triggers = {
    bootstrap_pubkey = openstack_compute_keypair_v2.bootstraps[each.value.cluster].public_key,
    machine_id       = openstack_compute_instance_v2.machines[each.key].id,
  }

  connection {
    host        = each.value.machine.access_ip
    type        = "ssh"
    user        = each.value.machine.access_user
    private_key = local.access_private_key
  }

  provisioner "remote-exec" {
    inline = [
      "echo '${
        openstack_compute_keypair_v2.bootstraps[each.value.cluster].public_key
      }' >> /home/${each.value.machine.access_user}/.ssh/authorized_keys",
    ]
  }
}

resource "null_resource" "expand_cluster" {
  for_each = local.heat.enabled ? {} : {
    for key, item in local.bootstraps :
    key => item
    if length(local.all_nodes[key]) > 0
  }

  triggers = {
    run_bootstrap_id = null_resource.run_bootstrap[each.key].id,
    node_ids = join(",", [
      for machine in local.all_nodes[each.key] :
      openstack_compute_instance_v2.machines[machine.name].id
    ])
  }

  connection {
    host        = each.value.access_ip
    type        = "ssh"
    user        = each.value.access_user
    private_key = local.access_private_key
  }

  provisioner "file" {
    destination = "/tmp/nodes.yaml"
    content     = <<EOF
---
%{for node in local.all_nodes[each.key]~}
apiVersion: v1
kind: Node
metadata:
  name: ${node.name}
  annotations:
    metalk8s.scality.com/ssh-user: ${node.access_user}
    metalk8s.scality.com/ssh-host: ${node.access_ip}
    metalk8s.scality.com/ssh-key-path: /etc/metalk8s/pki/salt-bootstrap
    metalk8s.scality.com/ssh-sudo: 'true'
  labels:
    metalk8s.scality.com/version: 'METAL_VERSION'
    %{~for role in node.roles~}
    node-role.kubernetes.io/${role}: ''
    %{~endfor~}
spec:
  %{~if node.taints != []~}
  taints:
  %{~for taint in node.taints~}
  - effect: NoSchedule
    key: node-role.kubernetes.io/${taint}
  %{~endfor~}
  %{~endif~}
---
%{endfor~}
EOF
  }

  provisioner "remote-exec" {
    inline = flatten([
      "sudo cp /tmp/nodes.yaml /run/metalk8s/manifests/",
      join(" ", [
        "sudo sed -i",
        "s/METAL_VERSION/$(sudo cat /run/metalk8s/.cluster-version)/",
        "/run/metalk8s/manifests/nodes.yaml",
      ]),
      join(" ", [
        "sudo kubectl --kubeconfig /etc/kubernetes/admin.conf",
        "apply -f /run/metalk8s/manifests/nodes.yaml",
      ]),
      [
        for node in local.all_nodes[each.key] :
        join(" ", [
          "[[ $(sudo kubectl --kubeconfig /etc/kubernetes/admin.conf",
          "get node ${node.name}",
          "-o jsonpath='{.status.conditions[?(@.type==\"Ready\")].status}')",
          "= 'True' ]] && echo 'Node ${node.name} is ready, skipping.' ||",
          "sudo kubectl --kubeconfig /etc/kubernetes/admin.conf",
          "exec salt-master-bootstrap -n kube-system -c salt-master",
          "-- salt-run state.orch metalk8s.orchestrate.deploy_node",
          "saltenv=metalk8s-$(sudo cat /run/metalk8s/.cluster-version)",
          "pillar='{orchestrate: {node_name: ${node.name}}}'",
        ])
      ],
    ])
  }
}

resource "null_resource" "enable_ipip" {
  # If one of the networks used by Metal is the access network, PortSecurity
  # will still be enabled, so we need IPIP encapsulation
  for_each = local.heat.enabled ? {} : {
    for key, node in local.bootstraps :
    key => node
    if contains(values(node.cluster_info.networks), "__access__")
  }

  triggers = {
    run_bootstrap_id = null_resource.run_bootstrap[each.key].id,
  }

  connection {
    host        = each.value.access_ip
    type        = "ssh"
    user        = each.value.access_user
    private_key = local.access_private_key
  }

  provisioner "remote-exec" {
    inline = ["bash /tmp/metalk8s/scripts/enable_ipip.sh"]
  }
}

resource "null_resource" "provision_volumes" {
  for_each = local.heat.enabled ? {} : {
    for key, node in local.bootstraps :
    key => node
    if length(values(node.cluster_info.volumes)) > 0
  }

  triggers = {
    run_bootstrap_id = null_resource.run_bootstrap[each.key].id,
    target_node_ids = join(",", [
      for volume in each.value.cluster_info.volumes :
      # This is wrong: volume.node is the Node name in the cluster, not the
      # instance name
      openstack_compute_instance_v2.machines[volume.node].id
    ])
  }

  connection {
    host        = each.value.access_ip
    type        = "ssh"
    user        = each.value.access_user
    private_key = local.access_private_key
  }

  provisioner "file" {
    destination = "/tmp/volumes.yaml"
    content     = <<EOF
---
%{for volume in each.value.cluster_info.volumes~}
${templatefile(volume.template, { node = volume.node })}
---
%{endfor~}
EOF
  }

  provisioner "remote-exec" {
    inline = [
      "sudo cp /tmp/volumes.yaml /run/metalk8s/manifests/volumes.yaml",
      join(" ", [
        "sudo kubectl --kubeconfig /etc/kubernetes/admin.conf",
        "apply -f /run/metalk8s/manifests/volumes.yaml",
      ]),
    ]
  }
}
