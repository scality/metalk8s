# Terraform deployment configuration

prefix = "metalk8s-$random"

offline = ! $run_online

bastion = {
    enabled  = true,
    image    = "",
    flavour  = "",
}

bootstrap = {
    image   = "$image_name",
    flavour = "large",
}

nodes = {
    count   = $workers_count + 2, # Two additional control plane nodes
    image   = "$image_name",
    flavour = "$flavour_name",
}

control_plane = {
    enabled         = true,
    existing_subnet = "$cp_subnet_name",
    cidr            = "",
}

workload_plane = {
    enabled         = true,
    existing_subnet = "$wp_subnet_name",
    cidr            = "",
}

metalk8s_iso = {
    mode = "remote",
    source = "https://eve.devsca.com/github/scality/metalk8s/artifacts/builds/github%3Ascality%3Ametalk8s%3Apromoted-$metalk8s_version/",
    destination = "/archives/metalk8s.iso",
    mountpoint  = "/srv/scality/metalk8s-$metalk8s_version",
}

metalk8s_bootstrap         = true
metalk8s_provision_volumes = true