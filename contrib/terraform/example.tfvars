# Networks
access_network = {
  name   = "tenantnetwork1",
  id     = "",
  online = false,
}

private_networks = {
  control_plane = {
    existing_subnet = "",
    cidr            = "192.168.1.0/24",
  },
  workload_plane = {
    existing_subnet = "",
    cidr            = "192.168.2.0/24",
  }
}

# Machines
bastion = {
  enabled = true,
  image   = "centos7",
  flavor  = "medium",
}

machine_groups = {
  bootstrap = {
    count  = 1,
    image  = "centos7",
    flavor = "large",
    networks = ["control_plane", "workload_plane"],
  },
  master = {
    count  = 2,
    image  = "centos7",
    flavor = "large",
    networks = ["control_plane", "workload_plane"],
  },
  worker = {
    count  = 3,
    image  = "centos7",
    flavor = "large",
    networks = ["control_plane", "workload_plane"],
  },
}

# MetalK8s
metalk8s_iso = {
  mode        = "local",
  source      = "/path/to/metalk8s.iso", # Omit provisioning if this is empty
  destination = "/archives/metalk8s.iso",
  mountpoint  = "/mnt/scality/metalk8s",
}

metalk8s_clusters = {
  main = {
    bootstrap = {
      group  = "bootstrap",
      roles  = ["bootstrap", "master", "etcd"], # Leave empty to keep defaults
      taints = ["bootstrap"],                   # Leave empty to keep defaults
    },
    node_groups = {
      master = {
        group  = "master",
        roles  = ["master", "etcd", "infra"],
        taints = ["infra"],
      },
      worker = {
        group  = "worker",
        roles  = ["node"],
        taints = [],
      },
    },
    networks = {
      control_plane  = "control_plane",
      workload_plane = "workload_plane",
    },
    volumes = [
      { node = "master-1", template = "volumes/alertmanager-sparse.yaml" },
      { node = "master-1", template = "volumes/prometheus-sparse.yaml" },
    ],
  },
}
