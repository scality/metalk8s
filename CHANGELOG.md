# CHANGELOG
## Release 2.10.3 (in development)
### Enhancements

- Bump Kubernetes version to 1.21.4
  (PR[#3495](https://github.com/scality/metalk8s/pull/3495))

## Release 2.10.2
### Bug fixes
- Fix the link to documentation from the UI navigation bar
  (PR[#3486](https://github.com/scality/metalk8s/pull/3486))

## Release 2.10.1
### Enhancements

- Improve performance of Shell UI when switching between navigation entries
  (PR[#3469](https://github.com/scality/metalk8s/pull/3469))

### Bug fixes

- Fix a few issues in MetalK8s UI with error handling for Nodes deployment
  (PR[#3477](https://github.com/scality/metalk8s/pull/3477))

- [#3480](https://github.com/scality/metalk8s/issues/3480) - Switch Grafana
  base image to Ubuntu (and bump to 8.0.6) to handle DNS `SERVFAIL` errors
  gracefully
  (PR[#3481](https://github.com/scality/metalk8s/pull/3481))

- [#3474](https://github.com/scality/metalk8s/issues/3474) - Lower the alert
  thresholds for low filesystem available space and inodes to react before
  kubelet starts evicting pods
  (PR[#3479](https://github.com/scality/metalk8s/pull/3479))

- Fix "Logs" dashboard in Grafana (templating error)
  (PR[#3484](https://github.com/scality/metalk8s/pull/3484))

- [#3475](https://github.com/scality/metalk8s/issues/3475) - Fix broken links
  in MetalK8s UI for "Advanced Metrics" in Nodes and Volumes pages
  (PR[#3483](https://github.com/scality/metalk8s/pull/3483))

## Release 2.10.0
### Enhancements

- Bump Kubernetes version to 1.21.3
  (PR[#3452](https://github.com/scality/metalk8s/pull/3452))

- Bump CoreDNS version to 1.8.0
  (PR[#3354](https://github.com/scality/metalk8s/pull/3354))

- Bump prometheus-adapter chart version to 2.14.2.
  k8s-prometheus-adapter-amd64 image has been bump accordingly to v0.8.4
  (PR[#3429](https://github.com/scality/metalk8s/pull/3429))

- [#3279](https://github.com/scality/metalk8s/issues/3279) - Bump
  fluent-bit chart version from 2.0.1 to 2.2.0
  fluent-bit-plugin-loki image has been bump accordingly from v1.6.0-amd64
  to v2.1.0-amd64 (PR[#3364](https://github.com/scality/metalk8s/pull/3364))

- Bump loki chart version to 2.5.2,
  loki image has been bump accordingly to 2.2.1
  (PR[#3428](https://github.com/scality/metalk8s/pull/3428))

- Migrate from stable Dex deprecated chart to dexidp.io Dex chart, and
  bump dex image to v2.28.1
  (PR[#3427](https://github.com/scality/metalk8s/pull/3427))

- Bump kube-prometheus-stack charts version to 16.9.1
  The following images have also been bumped accordingly:
   - grafana to 8.0.1
   - k8s-sidecar to 1.12.2
   - kube-state-metrics to v2.0.0
   - node-exporter to v1.1.2
   - prometheus to v2.27.1
   - prometheus-config-reloader to v0.48.1
   - prometheus-operator to v0.48.1
  (PR[#3422](https://github.com/scality/metalk8s/pull/3422))

- Bump ingress-nginx chart version to 3.34.0
  nginx-ingress-controller image has been bump accordingly to v0.47.0
  (PR[#34381](https://github.com/scality/metalk8s/pull/3438))

- Bump Calico version to 3.19.1
  (PR [#3430](https://github.com/scality/metalk8s/pull/3430))

- [#3366](https://github.com/scality/metalk8s/issues/3366) - Use
  `systemd` cgroupDriver for Kubelet and containerd
  (PR[#3377](https://github.com/scality/metalk8s/pull/3377))

- Allow to manually deploy a second registry container
  (PR[#3400](https://github.com/scality/metalk8s/pull/3400))

- [#3244](https://github.com/scality/metalk8s/issues/3244) - Support 
  LVMLogicalVolume volume in the UI
  (PR[#3410](https://github.com/scality/metalk8s/pull/3410))

- [#2381](https://github.com/scality/metalk8s/issues/2381)) - Allow
  configuring the Control Plane Ingress' external IP, to enable high
  availability with failover of this (virtual) IP between control plane
  nodes (PR[#3415](https://github.com/scality/metalk8s/pull/3415)).
  If supported by the user environment, MetalK8s can manage fail-over
  of this virtual IP using [MetalLB](https://metallb.universe.tf/)
  (PR[#3418](https://github.com/scality/metalk8s/pull/3418)).

- Use webpack 5 module federation to provide a framework allowing
  aggregation of solutions UIs
  (PR[#3414](https://github.com/scality/metalk8s/pull/3414))

### Bug fixes
- [#3445](https://github.com/scality/metalk8s/issues/3445) - Avoid
  kube-apiserver timeout during single node cluster upgrade when a
  lot of pod ran on the node
  (PR[#3447](https://github.com/scality/metalk8s/pull/3447))

### Breaking changes

- [#2199](https://github.com/scality/metalk8s/issues/2199) - Prometheus label
  selector for `ServiceMonitor` and `PrometheusRule` objects has changed from
  `release: prometheus-operator` + `app: prometheus-operator` to
  `metalk8s.scality.com/monitor: ''`
  (PR[#3356](https://github.com/scality/metalk8s/pull/3356))

## Release 2.9.3 (in development)
## Enhancements
- Allow hostPort on 127.0.0.1
  (PR[#3396](https://github.com/scality/metalk8s/pull/3396))

## Release 2.9.2
### Bug fixes
- Fixed bug in display when adding a new disk with long labels
  (PR[#3328](https://github.com/scality/metalk8s/issues/3328))

## Enhancements
- Check on minion ID / Kubernetes node name match constraints
  (PR[#3258](https://github.com/scality/metalk8s/issues/3258))

- Add custom metalk8s_network.routes execution module
  (PR[#3352](https://github.com/scality/metalk8s/pull/3352))

## Release 2.9.1
### Enhancements

- Add an optional order property to manage ordering of navbar entries
  (PR[#3334](https://github.com/scality/metalk8s/pull/3334))

### Bug fixes

- Re-support MetalK8s UI on Firefox
  (PR[#3399](https://github.com/scality/metalk8s/pull/3330))

- Remove unnecessary `View logical alerts` toggle in the Alert page
  (PR[#3399](https://github.com/scality/metalk8s/pull/3330))

## Release 2.9.0
### Features Added

- [#3180](https://github.com/scality/metalk8s/issues/3180) - All alerts from
  Alertmanager are now stored in Loki database for persistence
  (PR[#3191](https://github.com/scality/metalk8s/pull/3191))

- [#3294](https://github.com/scality/metalk8s/issues/3294) - Allow to manage
  `kube-apiserver` feature gates from Bootstrap Configuration file
  (PR[#3318](https://github.com/scality/metalk8s/pull/3318))

- Complete rebranding of MetalK8s UI (PR[#3295](https://github.com/scality/metalk8s/pull/3295))

### Enhancements
- Bump Kubernetes version to 1.20.6
  (PR[#3311](https://github.com/scality/metalk8s/pull/3311))

- Include [qperf](https://github.com/linux-rdma/qperf) in the `metalk8s-utils`
  container image (PR [#3174](https://github.com/scality/metalk8s/pull/3174))

- Bump Node.js version to 14.16.0 (PR[#3214](https://github.com/scality/metalk8s/pull/3214))

- Introduce a `shell-ui` project that groups various UI components to be reused by
solutions UIs (PR[#3106](https://github.com/scality/metalk8s/pull/3106))

- Move the navbar component to `shell-ui` to enable its reuse by solutions UIs
(PR[#3110](https://github.com/scality/metalk8s/pull/3110))

- Add a static user/groups mapping configuration as part of `shell-ui` configuration to 
allow solutions UIs displaying features according to some user groups
(PR[#3154](https://github.com/scality/metalk8s/pull/3154))

- Enrich `sosreport` output (PR[#3222](https://github.com/scality/metalk8s/pull/3222))

- [#1997](https://github.com/scality/metalk8s/issues/1997) - Add support for
  LVM LogicalVolume Volume creation using storage operator
  (PR [#3220](https://github.com/scality/metalk8s/pull/3220))

### Bug fixes

- Ensure MetalK8s UI can be exposed behind a non-root path
  (PR[#3254](https://github.com/scality/metalk8s/pull/3254),
  PR[#3299](https://github.com/scality/metalk8s/pull/3299))

## Release 2.8.1 (in development)
### Enhancements

### Bug fixes

- [#3223](https://github.com/scality/metalk8s/issues/3223) - Prevent failures
  when some `sysctl` configuration file contains a `%` character
  (PR [#3224](https://github.com/scality/metalk8s/pull/3224))

## Release 2.8.0
### Enhancements

- [#3051](https://github.com/scality/metalk8s/issues/3051) - Prefix OIDC claims
  to prevent naming clashes
  (PR [#3054](https://github.com/scality/metalk8s/pull/3054))

- [#2164](https://github.com/scality/metalk8s/issues/2164) - Add RHEL 8 support
  (PR [#2997](https://github.com/scality/metalk8s/pull/2997))

- Bump Kubernetes version to 1.19.8 (PR [#3137](https://github.com/scality/metalk8s/pull/3137))

- Bump `coredns` version to 1.7.0 (PR [#3008](https://github.com/scality/metalk8s/pull/3008))

- Bump etcd version to 3.4.13-0 (PR [#3008](https://github.com/scality/metalk8s/pull/3008))

- [#3026](https://github.com/scality/metalk8s/issues/3026) - Embed a checksum
  of the data contained in the ISO image inside the ISO so its integrity can be
  ensured after download, next to or instead of checking the `SHA256SUM` using
  `checkisomd5` (from [isomd5sum](https://github.com/rhinstaller/isomd5sum))
  (PR [#3032](https://github.com/scality/metalk8s/pull/3032))

- [#2996](https://github.com/scality/metalk8s/issues/2996) - The `bash-completion`
  completions for the `kubectl` command are now provided when `kubectl` is installed
  (PR [#3039](https://github.com/scality/metalk8s/pull/3039))

- Use the [Alpine Linux](https://alpinelinux.org)-based version of the
  [nginx](https://nginx.org) [container image](https://hub.docker.com/_/nginx),
  reducing disk space used by the ISO and in image caches
  (PR [#3047](https://github.com/scality/metalk8s/pull/3047))

- [#2932](https://github.com/scality/metalk8s/issues/2932) - Add system partitions tab in
  MetalK8s UI node page
  (PR [#3045](https://github.com/scality/metalk8s/pull/3045))

- [#2925](https://github.com/scality/metalk8s/issues/2925) - Compare node metrics with average from MetalK8s UI
  (PR [#3078](https://github.com/scality/metalk8s/pull/3078))

- Improve the upgrade robustness when the platform is a bit slow
  (PR [#3105](https://github.com/scality/metalk8s/pull/3105))

- Use HTTPS endpoints for kube-controller-manager and kube-scheduler
  (PR [#3152](https://github.com/scality/metalk8s/pull/3152))

- [#3092](https://github.com/scality/metalk8s/issues/3092) - Check if all needed
  addresses are free, or already used by a MetalK8s process
  (PR [#3163](https://github.com/scality/metalk8s/pull/3163))

### Bug fixes

- [#3079](https://github.com/scality/metalk8s/issues/3079) - Ensure configured
  archives are valid in the iso-manager script
  (PR [#3081](https://github.com/scality/metalk8s/pull/3081))

- [#3022](https://github.com/scality/metalk8s/issues/3022) - Ensure salt-master
  container can start at reboot even if local salt-minion is down
  (PR [#3041](https://github.com/scality/metalk8s/pull/3041))

- [#3075](https://github.com/scality/metalk8s/issues/3075) - Properly install "base"
  Salt dependencies from "base" RHEL 7 repository
  (PR [#3083](https://github.com/scality/metalk8s/pull/3083))

- [#3128](https://github.com/scality/metalk8s/issues/3128) - No longer assume ISOs
  mounted under `/srv/scality` are Solutions
  (PR [#3182](https://github.com/scality/metalk8s/pull/3182))

### Deprecations and Removals

- [#3168](https://github.com/scality/metalk8s/issues/3168) - [UI] Remove the environment page
  (PR [#3167](https://github.com/scality/metalk8s/pull/3167))

## Release 2.7.4 (in development)
### Enhancements
- Bump Salt version to 3002.6
  (PR [#3248](https://github.com/scality/metalk8s/pull/3248))

## Release 2.7.3
### Enhancements
- [#2992](https://github.com/scality/metalk8s/issues/2992) - Check for conflicting
  packages (`docker`, `docker-ce` and `containerd.io`) on target machines before
  installation (bootstrap or expansion)
  (PR [#3153](https://github.com/scality/metalk8s/pull/3153), backport of
  PR [#3050](https://github.com/scality/metalk8s/pull/3050))

- [#3067](https://github.com/scality/metalk8s/issues/3067) - Check for conflicting
  services (`firewalld`) already started or enabled on target machines before
  installation (bootstrap or expansion)
  (PR [#3153](https://github.com/scality/metalk8s/pull/3153), backport of
  PR [#3069](https://github.com/scality/metalk8s/pull/3069))

- Improve error handling when providing invalid CA minion in Bootstrap
  configuration file
  (PR [#3153](https://github.com/scality/metalk8s/pull/3153), backport of
  PR [#3065](https://github.com/scality/metalk8s/pull/3065))

- [kubernetes/kubernetes#57534](https://github.com/kubernetes/kubernetes/issues/57534) -
  Check if a route exists for the Service IPs CIDR
  (PR [#3153](https://github.com/scality/metalk8s/pull/3153), backport of
  PR [#3076](https://github.com/scality/metalk8s/pull/3076))

### Bug fixes
- Do not install `containerd.io` instead of `containerd` and `runc` when this
  package is available in one configured repository
  (PR [#3153](https://github.com/scality/metalk8s/pull/3153), backport of
  PR [#3050](https://github.com/scality/metalk8s/pull/3050))

### Security fixes
- Due to vulnerabilities (
[CVE-2021-3197](https://cve.mitre.org/cgi-bin/cvename.cgi?name=2021-3197),
[CVE-2021-25281](https://cve.mitre.org/cgi-bin/cvename.cgi?name=2021-25281),
[CVE-2021-25282](https://cve.mitre.org/cgi-bin/cvename.cgi?name=2021-25282),
[CVE-2021-25283](https://cve.mitre.org/cgi-bin/cvename.cgi?name=2021-25283),
[CVE-2021-25284](https://cve.mitre.org/cgi-bin/cvename.cgi?name=2021-25284),
[CVE-2021-3148](https://cve.mitre.org/cgi-bin/cvename.cgi?name=2021-3148),
[CVE-2020-35662](https://cve.mitre.org/cgi-bin/cvename.cgi?name=2020-35662),
[CVE-2021-3144](https://cve.mitre.org/cgi-bin/cvename.cgi?name=2021-3144),
[CVE-2020-28972](https://cve.mitre.org/cgi-bin/cvename.cgi?name=2020-28972)
and
[CVE-2020-28243](https://cve.mitre.org/cgi-bin/cvename.cgi?name=2020-28243))
affecting all Salt versions inferior to `3002.5`, this release ships with
all Saltstack updated to `3002.5`.

    Upgrade Salt to version `3002.5`
    (PR [#3158](https://github.com/scality/metalk8s/pull/3158))

## Release 2.7.2
### Enhancements
- Bump Kubernetes version to 1.18.16
  (PR [#3132](https://github.com/scality/metalk8s/pull/3132))

- Improve Salt master and cluster upgrade stability in slow environments
  (PR [#3125](https://github.com/scality/metalk8s/pull/3125))

### Bug fixes
- Embed `pause` image version 3.2 instead of 3.1 needed for MetalK8s to work
  offline (needed by containerd version superior to 1.4.0)
  (PR [#3120](https://github.com/scality/metalk8s/pull/3120))

## Release 2.7.1
### Bug fixes
- Fix a bug where salt-minion process does not get properly restarted
  (PR [#3059](https://github.com/scality/metalk8s/pull/3059))
- [#3064](https://github.com/scality/metalk8s/issues/3064) - Fix upgrade from
  2.6.x (PR [#3048](https://github.com/scality/metalk8s/pull/3048))
- Prevent unneeded log warning about kubeconfig regeneration
  (PR [#3053](https://github.com/scality/metalk8s/pull/3053))

## Release 2.7.0
### Features Added
- [#2964](https://github.com/scality/metalk8s/issues/2964) - [UI] Ability to
  create Volumes in batches
  (PR [#2981](https://github.com/scality/metalk8s/pull/2981))

### Enhancements
- Bump Kubernetes version to 1.18.15
  (PR [#3035](https://github.com/scality/metalk8s/pull/3035))

- [#2955](https://github.com/scality/metalk8s/issues/2955) - Bump `containerd`
  version to 1.4.3 (PR [#2956](https://github.com/scality/metalk8s/pull/2956)).

- Bump `coredns` version to 1.6.7 (PR [#2816](https://github.com/scality/metalk8s/pull/2816))

- [#2203](https://github.com/scality/metalk8s/issues/2203) - Migrate Salt to Python3
  and bump to version 3002.2 (PR [#2839](https://github.com/scality/metalk8s/pull/2839))

- Bump `calico` version to 3.17.0 (PR [#2943](https://github.com/scality/metalk8s/pull/2943))

- Bump `fluent-bit` chart to 2.0.1 and `loki` chart to 2.1.0
  (PR [#2946](https://github.com/scality/metalk8s/pull/2946))

- [#2985](https://github.com/scality/metalk8s/issues/2985) - Bump `dex` version
  to 2.27.0 (PR [#2990](https://github.com/scality/metalk8s/pull/2990))

- Replace the prometheus-operator chart by the kube-prometheus-stack one and
  bump the version to 12.2.3.
  All the container images of this stack have also been bumped:
  - alertmanager from v0.20.0 to v0.21.0
  - grafana from 6.7.4 to 7.3.5 (PR [#3006](https://github.com/scality/metalk8s/pull/3006))
  - k8s-sidecar from 0.1.20 to 1.1.0
  - kube-state-metrics from v1.9.5 to v1.9.7
  - node-exporter from v0.18.1 to v1.0.1
  - prometheus from v2.16.0 to v2.22.1
  - prometheus-config-reload from v0.38.1 to v0.43.2
  - prometheus-operator from v0.38.1 to v0.43.2
  (PR [#2948](https://github.com/scality/metalk8s/pull/2948))

- Bump `prometheus-adapter` chart to 2.10.1
  (PR [#3007](https://github.com/scality/metalk8s/pull/3007))

- Bump `ingress-nginx` chart to 3.13.0
  (PR [#2961](https://github.com/scality/metalk8s/pull/2961))

- [#2953](https://github.com/scality/metalk8s/issues/2953) - Allow customization
  of Prometheus retention (time and size based), see
  [MetalK8s documentation](https://metal-k8s.readthedocs.io/en/2.7.0/operation/cluster_and_service_configuration.html#prometheus-configuration-customization)
  (PR [#2968](https://github.com/scality/metalk8s/pull/2968))

- The `screen` and `tmux` terminal multiplexers are now installed in the
  `metalk8s-utils` container image
  (PR [#2995](https://github.com/scality/metalk8s/pull/2995))

- The `bash-completion` completions for the `kubectl` command are now included
  in the `metalk8s-utils` container image
  (PR [#2995](https://github.com/scality/metalk8s/pull/2995))

- [#2931](https://github.com/scality/metalk8s/issues/2931) - [UI] Improve
  Volumes list performance using a virtualized table
  (PR [#2938](https://github.com/scality/metalk8s/pull/2938))

### Bug Fixes

- [#2908](https://github.com/scality/metalk8s/issues/2908) - Make upgrade script
  more robust about static pod restart and improve user experience
  (PR [#2928](https://github.com/scality/metalk8s/pull/2928))

- [#2726](https://github.com/scality/metalk8s/issues/2726) - Ensure sparse loop
  volumes are all provisioned on reboot
  (PR [#2936](https://github.com/scality/metalk8s/pull/2936))

- Make sure container engine is ready before trying to import container images
  (PR [#3020](https://github.com/scality/metalk8s/pull/3020))

- Fix invalid return of Success when `wait_minions` runner fails
  (PR [#3031](https://github.com/scality/metalk8s/pull/3031))

- Improve the robustness of salt orchestrate execution
  (PR [#3033](https://github.com/scality/metalk8s/pull/3033))

- [UI] Fix memory leak in chart component
  (PR [#2988](https://github.com/scality/metalk8s/pull/2988))

- [#2840](https://github.com/scality/metalk8s/issues/2840) - Prevent duplicate
  static Pods from being created when updating their manifests
  (PR [#3003](https://github.com/scality/metalk8s/pull/3003))

- [#3014](https://github.com/scality/metalk8s/issues/3014) - Fix sosreport
  `metalk8s` plugin's `describe` option
  (PR [#3013](https://github.com/scality/metalk8s/pull/3013))

## Release 2.6.2 (in development)

## Release 2.6.1

### Features Added
- [#1887](https://github.com/scality/metalk8s/issues/1887) - All Kubernetes
  kubeconfig, client and server certificates are now automatically regenerated
  when close to the expiration date (less than 45 days)
  (PR [#2914](https://github.com/scality/metalk8s/pull/2914))

- [#2919](https://github.com/scality/metalk8s/issues/2919) - [UI] Ability to
  sort in Nodes list (PR [#2926](https://github.com/scality/metalk8s/pull/2926))

### Enhancements
- Bump Kubernetes version to 1.17.17
  (PR [#3036](https://github.com/scality/metalk8s/pull/3036))

- [UI] Upgrade React to 17.0.1
  (PR [#2926](https://github.com/scality/metalk8s/pull/2926))

### Bug Fixes
- [#2949](https://github.com/scality/metalk8s/issues/2949) - [UI] Handle
  terminating environments and improve SaltAPI error handling
  (PR [#2954](https://github.com/scality/metalk8s/pull/2954))

## Release 2.6.0

### Breaking changes
- [#2581](https://github.com/scality/metalk8s/issues/2851) - Solution UI are
  no longer deployed by MetalK8s, it's now the responsibility of the Solution
  Operators (PR [#2617](https://github.com/scality/metalk8s/pull/2617))

### Features Added
- Extend the set of packages installed in the `metalk8s-utils` container image
  (Partially resolves issue [#2156](https://github.com/scality/metalk8s/issues/2156),
  PR [#2374](https://github.com/scality/metalk8s/pull/2374))
- Upgrade `containerd` to 1.2.14 (PR [#2874](https://github.com/scality/metalk8s/pull/2874))
- Enable `seccomp` support in `containerd`
  (Issue [#2259](https://github.com/scality/metalk8s/issues/2259),
  PR [#2369](https://github.com/scality/metalk8s/pull/2369))
- [#1095](https://github.com/scality/metalk8s/issues/1095) - Ability to use
  multiple CIDRs for control plane and workload plane networks and to specify
  the workload plane MTU to compute the MTU used by Calico
  (PR [#2677](https://github.com/scality/metalk8s/pull/2677))
- Deploy log aggregation layer, based on Loki and Fluentbit (see
  [#2722](https://github.com/scality/metalk8s/pull/2722),
  [#2723](https://github.com/scality/metalk8s/pull/2723),
  [#2727](https://github.com/scality/metalk8s/pull/2727),
  [#2738](https://github.com/scality/metalk8s/pull/2738), and
  [#2745](https://github.com/scality/metalk8s/pull/2745))

### Security fixes
- Due to vulnerabilities (
[CVE-2020-16846](https://cve.mitre.org/cgi-bin/cvename.cgi?name=CVE-2020-16846)
and
[CVE-2020-25592](https://cve.mitre.org/cgi-bin/cvename.cgi?name=CVE-2020-25592))
affecting all Salt-API versions inferior to `3000.5`, this release ships with
all Saltstack updated to `3000.5`.

    Upgrade Salt to version `3000.5`
    (PR [#2916](https://github.com/scality/metalk8s/pull/2916))

### Enhancements
- [#2674](https://github.com/scality/metalk8s/issues/2674) - Bump K8S version
to 1.17.14 (PR [#2923](https://github.com/scality/metalk8s/pull/2923))

- [#2572](https://github.com/scality/metalk8s/issues/2572) - Bump CoreDNS
version to 1.6.5 (PR [#2582](https://github.com/scality/metalk8s/pull/2582))

- Bump Calico version to 3.16.1
  (PR[#2824](https://github.com/scality/metalk8s/pull/2824))

## Release 2.5.3 (in development)

### Enhancements
- [#3218](https://github.com/scality/metalk8s/issues/3218) - Enrich sosreport
  plugins:
  - Add a Prometheus snapshot
  - Add Salt configuration
  - Add salt-minion journal
  - Add kubectl top nodes & pods
  - Add bootstrap and solutions configuration files
  (PR [#3222](https://github.com/scality/metalk8s/pull/3222))

### Bug fixes
- [#3247](https://github.com/scality/metalk8s/issues/3247) - Fix a bug where
  Salt minion process may fail to restart during upgrade or downgrade process
  (PR [#3281](https://github.com/scality/metalk8s/pull/3281))

## Release 2.5.2

### Enhancements
- [#2572](https://github.com/scality/metalk8s/issues/2572) - Bump CoreDNS
  version to 1.6.2 (PR [#2575](https://github.com/scality/metalk8s/pull/2575))

- [#2674](https://github.com/scality/metalk8s/issues/2674) - Bump Kubernetes
  version to 1.16.15 (PR [#3140](https://github.com/scality/metalk8s/pull/3140))

- [#2421](https://github.com/scality/metalk8s/issues/2421) - Add support for raw
  block volume (PR [#2651](https://github.com/scality/metalk8s/pull/2651))

### Bug fixes
- [#2854](https://github.com/scality/metalk8s/issues/2854) - Bump containerd
  version to 1.2.14 to fix
  [CVE-2020-15157](https://cve.mitre.org/cgi-bin/cvename.cgi?name=CVE-2020-15157)
  (PR [#2874](https://github.com/scality/metalk8s/pull/2874))

- [#2653](https://github.com/scality/metalk8s/issues/2653) - Bind MetalK8s
  OIDC static admin user to a Grafana Admin role
  (PR [#2742](https://github.com/scality/metalk8s/pull/2742))

- [#2704](https://github.com/scality/metalk8s/issues/2704) - Always install the
  right Salt minion version during Bootstrap
  (PR [#2734](https://github.com/scality/metalk8s/pull/2734))

- [#2653](https://github.com/scality/metalk8s/issues/2653) - Dex admin user have
  super-admin access in Grafana
  (PR [#2743](https://github.com/scality/metalk8s/pull/2743))

- Storage Operator no longer spams Salt API because of an infinite reconciliation loop
  (Commit [b0eca3d84](https://github.com/scality/metalk8s/commit/b0eca3d84e13c37235e0780cc84490cc7f6644e9), PR [#2651](https://github.com/scality/metalk8s/pull/2651))

## Release 2.5.1

### Breaking changes

- Solutions product information format has changed, there is a new
  `manifest.yaml` file to describe the whole Solution instead of the
  `product.txt` and `config.yaml`
  ([#2422](https://github.com/scality/metalk8s/issues/2422)).
  Solution archives working on previous versions of MetalK8s will no
  longer be compatible and will need to be regenerated.
  See [Solutions documentation](https://metal-k8s.readthedocs.io/en/development-2.5/developer/solutions/archive.html#product-information)
  for details about the new format.

### Enhancements
- [#2590](https://github.com/scality/metalk8s/issues/2590) - Bump Kubernetes
version to 1.16.10 (PR [#2597](https://github.com/scality/metalk8s/pull/2597))

- [#2423](https://github.com/scality/metalk8s/issues/2423) - Bump
nginx-ingress-controller version to 0.30.0
(PR [#2446](https://github.com/scality/metalk8s/pull/2446))

- [#2429](https://github.com/scality/metalk8s/issues/2429) - Bump Dex
version to 2.23.0
(PR [#2437](https://github.com/scality/metalk8s/pull/2437))

- [#2430](https://github.com/scality/metalk8s/issues/2430) - Bump
prometheus-operator version to 8.13.0
(PR [#2557](https://github.com/scality/metalk8s/pull/2557))

- [#2431](https://github.com/scality/metalk8s/issues/2431) - Bump
Prometheus-adapter version to 0.6.0
(PR [#2441](https://github.com/scality/metalk8s/pull/2441))

- [#2488](https://github.com/scality/metalk8s/issues/2488) - Update default
CSC value during upgrade/downgrade
(PR [#2513](https://github.com/scality/metalk8s/pull/2513))

- [#2493](https://github.com/scality/metalk8s/issues/2493) - Use async call
for disk.dump during Volume provisioning
(PR [#2571](https://github.com/scality/metalk8s/pull/2571))

- Add support for CustomResourceDefinition apiextensions.k8s.io/v1 in
`metalk8s_kubernetes` Salt module
(PR [#2583](https://github.com/scality/metalk8s/pull/2583))

### Bug fixes
- [#2434](https://github.com/scality/metalk8s/issues/2434) - Wait for a
single Salt Master container during Bootstrap
(PR [#2435](https://github.com/scality/metalk8s/pull/2435))

- [#2526](https://github.com/scality/metalk8s/issues/2526) - Add 'groups'
scope when requesting an id_token from Dex in the UI
(PR [#2529](https://github.com/scality/metalk8s/pull/2529))

- [#2443](https://github.com/scality/metalk8s/issues/2443) - Improve error
handling for Salt jobs in the UI
(PR [#2475](https://github.com/scality/metalk8s/pull/2475))

- [#2495](https://github.com/scality/metalk8s/issues/2495) - Fix monitoring
page to display all alerts in the UI
(PR [#2503](https://github.com/scality/metalk8s/pull/2503))

- [#2569](https://github.com/scality/metalk8s/issues/2569) - Restart Dex Pod
automatically upon CSC Dex configuration changes
(PR [#2573](https://github.com/scality/metalk8s/pull/2573))

- [#2533](https://github.com/scality/metalk8s/issues/2533) - Use dedicated
kubeconfig for Salt master
(PR [#2534](https://github.com/scality/meltalk8s/pull/2534))

## Release 2.5.0

### Breaking changes
- Basic authentication has been deprecated in favour of OpenID Connect (OIDC)
  with Dex being deployed as a local Identity Provider, used by Kubernetes
  API and Grafana.

  This implies:
    - The existing users defined for Kubernetes API Basic Auth in
      (`/etc/kubernetes/htpasswd`) and for the Grafana admin will become
      unusable
    - A default admin user will be created in Dex, with the new
      credentials `admin@metalk8s.invalid`:`password` which can be used to
      access the MetalK8s UI and Grafana
    - Procedures to edit and add new users can now be found
      [here](https://metal-k8s.readthedocs.io/en/2.5.0/operation/account_administration.html)

- A new framework for persisting Cluster and Services Configurations (CSC) has
  been added to ensure configurations set by administrators are not lost during
  upgrade or downgrade and can be found [here](https://metal-k8s.readthedocs.io/en/2.5.0/developer/architecture/configurations.html).

  - User-provided configuration is now stored in ConfigMaps, and MetalK8s
    tooling will honor the values provided when deploying its services:
      - Dex uses `metalk8s-auth/metalk8s-dex-config`
      - Grafana uses `metalk8s-monitoring/metalk8s-grafana-config`
      - Prometheus uses `metalk8s-monitoring/metalk8s-prometheus-config`
      - Alertmanager uses `metalk8s-monitoring/metalk8s-alertmanager-config`

  - Documentation for changing and applying configuration values is
    found [here](https://metal-k8s.readthedocs.io/en/2.5.0/operation/cluster_and_service_configuration.html).

    Note that any configuration applied on other Kubernetes objects
    (e.g. a configuration Secret that Alertmanager uses, or the
    Deployment of Grafana) will be lost upon upgrade, and admins
    should make sure to prepare the relevant ConfigMaps from their
    existing configuration before upgrading to this version.

- The MetalK8s [UI](https://metal-k8s.readthedocs.io/en/2.5.0/installation/services.html#metalk8s-gui)
  has been re-branded with lots of changes to the Login screens and Navbar to
  offer a smoother experience.

### Features Added
- Upgrade Calico to 3.12.0 (PR [#2253](https://github.com/scality/metalk8s/pull/2253))

- [#2007](https://github.com/scality/metalk8s/issues/2007) - Deploy Dex in a
MetalK8s cluster from stable Helm Charts
(PR [#2025](https://github.com/scality/metalk8s/pull/2025))

- [#2015](https://github.com/scality/metalk8s/issues/2015) - Configure MetalK8s
UI to require authentication through Dex (OIDC)
(PR [#2042](https://github.com/scality/metalk8s/pull/2042))

- [#2016](https://github.com/scality/metalk8s/issues/2016) - Brand the Dex GUI
to match MetalK8s UI specifications
(PR [#2062](https://github.com/scality/metalk8s/pull/2062))

- [#2072](https://github.com/scality/metalk8s/issues/2072) - Remove support
for Kubernetes API server basic authentication
(PR [#2119](https://github.com/scality/metalk8s/pull/2119))

- [#2078](https://github.com/scality/metalk8s/issues/2078) - Store Dex
authentication access_token in the browser localStorage
(PR [#2088](https://github.com/scality/metalk8s/pull/2088))

- [#2255](https://github.com/scality/metalk8s/issues/2255) - Template and store
replicas count for Prometheus, Grafana & Alertmanager as service configurations
(PR [#2258](https://github.com/scality/metalk8s/pull/2258))

- [#2261](https://github.com/scality/metalk8s/issues/2261) - Template and store
Dex backend settings as service configurations
(PR [#2274](https://github.com/scality/metalk8s/pull/2274))

- [#2262](https://github.com/scality/metalk8s/issues/2262) - Template and store
Alertmanager Secret as a service configuration
(PR [#2289](https://github.com/scality/metalk8s/pull/2289))

- [#2328](https://github.com/scality/metalk8s/issues/2328) - Bump K8S version
to 1.16.8 (PR [#2363](https://github.com/scality/metalk8s/pull/2363))

- Enable OIDC based authentication for Grafana service
(PR [#2378](https://github.com/scality/metalk8s/pull/2378))

### Documentation
- [#2351](https://github.com/scality/metalk8s/issues/2351) - Update
documentation with default credentials for Metalk8s UI and Grafana UI
(PR [#2377](https://github.com/scality/metalk8s/pull/2377))

- [#2264](https://github.com/scality/metalk8s/issues/2264) - Add documentation
on the list of Cluster and Service configurations
(PR [#2291](https://github.com/scality/metalk8s/pull/2291))

## Release 2.4.5 (in development)

## Release 2.4.4

### Features added
- [#2561](https://github.com/scality/metalk8s/issues/2561) - install `kubectl`
on all master nodes (PR [#2562](https://github.com/scality/metalk8s/pull/2562))

### Security fixes
- Due to critical vulnerabilities (
[CVE-2020-11652](https://cve.mitre.org/cgi-bin/cvename.cgi?name=CVE-2020-11652)
and
[CVE-2020-11651](https://cve.mitre.org/cgi-bin/cvename.cgi?name=CVE-2020-11651))
with CVSS score of 10.0 affecting all Salt master versions inferior to
`3000.2`, this release ships with all Saltstack updated to `3000.3`.
Users, especially those who expose the Salt master to the Internet must
therefore upgrade immediately.

    [#650](https://github.com/scality/metalk8s/issues/650) - Upgrade Salt master
    to version `3000.3`
    (PR [#2549](https://github.com/scality/metalk8s/pull/2549))

- Due to an access control vulnerability
[CVE-2020-13379](https://cve.mitre.org/cgi-bin/cvename.cgi?name=CVE-2020-13379)
with CVSS score of 5.3 that was discovered affecting Grafana versions from
`3.0.1` through `7.0.1`, this release ships with a Grafana version updated to
`6.7.4`. For more, see [here](https://grafana.com/blog/2020/06/03/grafana-6.7.4-and-7.0.2-released-with-important-security-fix/)

    [#2600](https://github.com/scality/metalk8s/issues/2600) - Upgrade Grafana
    to `6.7.4` (PR [#2605](https://github.com/scality/metalk8s/issues/2605))

- A potential risk for privilege escalation in SaltAPI described
[here](https://github.com/scality/metalk8s/issues/2634) was fixed in this
release.

    [#2634](https://github.com/scality/metalk8s/issues/2634) - Prevent
    impersonation in SaltAPI
    (PR [#2642](https://github.com/scality/metalk8s/pull/2642))

    [#1528](https://github.com/scality/metalk8s/issues/1528) and
    [#2084](https://github.com/scality/metalk8s/issues/2084) - Tighten
    storage-operator permissions against Salt
    (PR [#2635](https://github.com/scality/metalk8s/pull/2635))

### Enhancements
- [#2589](https://github.com/scality/metalk8s/issues/2589) - Bump Kubernetes
version to 1.15.12 (PR [#2595](https://github.com/scality/metalk8s/pull/2595))

- [#2029](https://github.com/scality/metalk8s/issues/2029) - Bump
python-kubernetes client to v11
(PR [#2554](https://github.com/scality/metalk8s/pull/2554))

- Make etcd expansions more resilient
(PR [#2147](https://github.com/scality/metalk8s/pull/2147))

- [#2585](https://github.com/scality/metalk8s/issues/2585) - Add state to
cleanup PrometheusRule CRs after upgrade/downgrade
(PR [#2594](https://github.com/scality/metalk8s/pull/2594))

- [#2533](https://github.com/scality/metalk8s/issues/2533) - Use dedicated
kubeconfig for Salt master
(PR [#2534](https://github.com/scality/meltalk8s/pull/2534))

### Bug fixes

- [#2444](https://github.com/scality/metalk8s/issues/2444) - Fix flaky SLS
rendering when missing a pillar key
(PR [#2445](https://github.com/scality/metalk8s/pull/2445))

- [#2524](https://github.com/scality/metalk8s/issues/2524) - Fix salt-minion
upgrade and downgrade
(PR [#2525](https://github.com/scality/metalk8s/pull/2525))

- [#2551](https://github.com/scality/metalk8s/issues/2551)  Fix downgrade
pre-check regarding the saltenv version
(PR [#2552](https://github.com/scality/metalk8s/pull/2552))

- [#2592](https://github.com/scality/metalk8s/issues/2592) - Fix invalid custom
object listing in `metalk8s_kubernetes` Salt module
(PR [#2593](https://github.com/scality/metalk8s/pull/2593))

- Fix apiserver-proxy to no longer proxy to non-master nodes
(PR [#2555](https://github.com/scality/metalk8s/pull/2555))

- [#2530](https://github.com/scality/metalk8s/issues/2530) - Make cluster
upgrade more robust to Pod disruption constraints
(PR [#2531](https://github.com/scality/metalk8s/pull/2531))

- [#2028](https://github.com/scality/metalk8s/issues/2028) - Improve the
resilience of node deployment
(PR [#2147](https://github.com/scality/metalk8s/pull/2147))

- Fix various issues in the bootstrap restore script
(PR [#2061](https://github.com/scality/metalk8s/pull/2061))

## Release 2.4.3

### Features added
- [#1993](https://github.com/scality/metalk8s/issues/1993) - Add Solutions
management, CLI tooling to deploy Solutions (complex Kubernetes applications)
(PR [#2279](https://github.com/scality/metalk8s/pull/2279))

### Enhancements
- Add `label_selector` in MetalK8s custom kubernetes salt module for listing
kubernetes objects (PR [#2236](https://github.com/scality/metalk8s/pull/2236))

- [#2328](https://github.com/scality/metalk8s/issues/2328) - Bump K8S version
to 1.15.11 (PR [#2362](https://github.com/scality/metalk8s/pull/2362))

- Salt grains cache is now enabled
(PR [#2417](https://github.com/scality/metalk8s/pull/2417)

### Bug fixes
- [#2334](https://github.com/scality/metalk8s/issues/2334) - Add and
install `yum-utils` package required for cluster expansion
(PR [#2343](https://github.com/scality/metalk8s/pull/2343))

- [#2245](https://github.com/scality/metalk8s/issues/2245) - Rephrase volume
status from `Available` to `Ready`
(PR [#2248](https://github.com/scality/metalk8s/pull/2248))

- [#2409](https://github.com/scality/metalk8s/issues/2409) - Deletion
on pending volumes (PR [#2410](https://github.com/scality/metalk8s/pull/2410))

## Release 2.4.2

### Breaking changes
- If `apiServer.host` is configured in `BootstrapConfiguration`, this is no
longer used (and must no longer be defined).
- If `apiServer.keepalived` is configured in `BootstrapConfiguration`, this is
no longer used, and Keepalived is no longer deployed at all.
- Generated `admin.conf` `KubeConfig` files point to the control-plane IP of the
host on which they are generated. You can override this when using them using
`kubectl`s `-s`/`--server` argument to point to another address.

### Features added
- [#1891](https://github.com/scality/metalk8s/issues/1891) - Allow adding
labels to *Volume*s from the UI
(PRs [#1979](https://github.com/scality/metalk8s/pull/1979) and
[#2066](https://github.com/scality/metalk8s/pull/2066))

- [#2049](https://github.com/scality/metalk8s/issues/2049) - Deploy
[prometheus-adapter](https://github.com/DirectXMan12/k8s-prometheus-adapter/)
to implement the `metrics.k8s.io` API, to support `kubectl top` and other
consumers of this API
(PR [#2057](https://github.com/scality/metalk8s/pull/2057))

- [#2103](https://github.com/scality/metalk8s/issues/2103) - Add a host-local
`nginx` on every node to provide highly-available and load-balanced access to
`kube-apiserver` (PR [#2106](https://github.com/scality/metalk8s/pull/2106))

- [#2052](https://github.com/scality/metalk8s/issues/2052) - Handle
configuration of an HTTP proxy for `containerd` (PRs
[#2071](https://github.com/scality/metalk8s/pull/2071) and
[#2201](https://github.com/scality/metalk8s/pull/2201))

- [#2149](https://github.com/scality/metalk8s/issues/2149) - Provide access to
the product documentation from the UI
(PR [#2176](https://github.com/scality/metalk8s/pull/2176))

### Bug fixes

- [#2083](https://github.com/scality/metalk8s/issues/2083) +
[#2102](https://github.com/scality/metalk8s/issues/2102) - Ensure safer
approach when expanding the `etcd` cluster
(PRs [#2099](https://github.com/scality/metalk8s/pull/2099) and
[#2198](https://github.com/scality/metalk8s/pull/2198))

## Release 2.4.1

### Features added

- ~~[#1891](https://github.com/scality/metalk8s/issues/1891) - Allow adding
labels to *Volume*s from the UI
(PR [#1979](https://github.com/scality/metalk8s/pull/1979))~~ _Note: this only
sets labels on the Volume object, not the created PV. Fixed in 2.4.2_

### Bug fixes

- [#1970](https://github.com/scality/metalk8s/issues/1970) - Ensure yum
history, repositories and RPM databases are properly closed after a
transaction (PR [#1971](https://github.com/scality/metalk8s/pull/1971))
