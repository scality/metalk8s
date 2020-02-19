machines_config = {
  bastion = {
    enabled = true,
    image   = "centos7",
    flavour = "medium",
  },
  bootstrap = {
    image   = "centos7",
    flavour = "large",
  },
  nodes = {
    count   = 5,
    image   = "centos7",
    flavour = "large",
  },
}

metalk8s_iso = {
  mode        = "local",
  source      = "/path/to/metalk8s.iso", # Omit provisioning if this is empty
  destination = "/archives/metalk8s.iso",
  mountpoint  = "/mnt/scality/metalk8s",
}

metalk8s_bootstrap         = true
metalk8s_provision_volumes = false
