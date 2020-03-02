# Terraform deployment configuration

prefix = "$prefix"

heat = {
    enabled = true,
    stack_name = "$prefix",
    parameters       = {},
    parameters_path  = "/run/heat/parameters.json",
    template_path    = "/run/heat/template/template.yaml", # if empty, default to ../heat/template.yaml
    environment_path = "",
}

openstack_images = {
    default = {
        image = "$image",
        user  = "centos",
    },
}
openstack_flavors = {
    bastion = "m1.medium",
    master = "m1.large",
    worker = "$flavor",
}

access_network = {
    name = "",
    id = "$access_network_id",
    online = "$online",
}

private_networks = {
    control_plane = {
        existing_subnet = "$cp_subnet_name",
        cidr = "",
    },
    workload_plane = {
        existing_subnet = "$wp_subnet_name",
        cidr = "",
    },
}

bastion = {
    enabled  = true,
    image    = "default",
    flavour  = "bastion",
}

machine_groups = {
    bootstrap = {
        count   = 1,
        image   = "default",
        flavour = "master",
        networks = ["control_plane", "workload_plane"],
    },
    master = {
        count   = 2,
        image   = "default",
        flavour = "master",
        networks = ["control_plane", "workload_plane"],
    },
    worker = {
        count   = $workers_count,
        image   = "default",
        flavour = "worker",
        networks = ["control_plane", "workload_plane"],
    },
}

metalk8s_iso = {
    mode = "remote",
    source = "https://$artifacts_user:$artifacts_pass@eve.devsca.com/github/scality/metalk8s/artifacts/builds/github%3Ascality%3Ametalk8s%3Apromoted-$metalk8s_version/",
    destination = "/archives/metalk8s.iso",
    mountpoint  = "/srv/scality/metalk8s-$metalk8s_version",
}

metalk8s_clusters = {
    main = {
        bootstrap = {
            group = "bootstrap",
            roles = ["bootstrap", "master", "etcd"],
            taints = ["bootstrap"],
        },
        node_groups = {
            master = {
                group = "master",
                roles = ["master", "etcd", "infra"],
                taints = ["infra"],
            },
            worker = {
                group = "worker",
                roles = ["node"],
                taints = [],
            },
        },
        networks = {
            control_plane = "control_plane",
            workload_plane = "workload_plane",
        },
        volumes = [],
    },
}
