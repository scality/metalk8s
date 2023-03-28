# CHANGELOG
## Release 124.1.5 (in development)

### Bug fixes

- Make metalk8s-sosreport packages compatible with sos version 4.5
  (PR[#4034](https://github.com/scality/metalk8s/pull/4034))

## Release 124.1.4

### Bug fixes

- Fix flaky invalid `HTTPSConnectionPool` exception raised when loading
  the pillar
  (PR[#3979](https://github.com/scality/metalk8s/pull/3979))

## Release 124.1.3

### Enhancements

- Bump Kubernetes version to
  [1.24.9](https://github.com/kubernetes/kubernetes/releases/tag/v1.24.9)
  (PR[#3969](https://github.com/scality/metalk8s/pull/3969))

- Bump the alpine base image used by `metalk8s-alert-logger`
  and `metalk8s-keepalived`
  image to `alpine:3.17.1`
  (PR[#3967](https://github.com/scality/metalk8s/pull/3967))

- Bump the rocky base image used by `salt-master` and `metalk8s-utils`
  images to `rockylinux:8.7.20221219`
  (PR[#3967](https://github.com/scality/metalk8s/pull/3967))

### Bug fixes

- Fix a flaky during expansions because of the Salt minion
  key that has not been accepted
  (PR[#3968](https://github.com/scality/metalk8s/pull/3968))

## Release 124.1.2

### Bug fixes

- Various fixes on UI side

## Release 124.1.1

### Bug fixes

- Fix Salt issue duplicate SLS id during pre-upgrade
  (PR[#3930](https://github.com/scality/metalk8s/pull/3930))

## Release 124.1.0

### Enhancements

- Bump k8s-sidecar version to
  [1.21.0](https://github.com/kiwigrid/k8s-sidecar/releases/tag/1.21.0)
  (PR[#3910](https://github.com/scality/metalk8s/pull/3910))

- Bump Loki chart version to
  [3.4.3](https://github.com/grafana/loki/releases/tag/helm-loki-3.4.3)
  The Loki image has been bumped accordingly to
  [2.7.0](https://github.com/grafana/loki/releases/tag/v2.7.0)
  (PR[#3921](https://github.com/scality/metalk8s/pull/3921))

### Bug fixes

- Add a workaround for Loki chunk deletion waiting for a proper
  fix in the next MetalK8s release
  (PR[#3923](https://github.com/scality/metalk8s/pull/3923))

## Release 124.0.2 (in development)

### Bug fixes

- Ensure that tar is installed before using it
  (PR[#3919](https://github.com/scality/metalk8s/pull/3919))

- Make MetalK8s sos report plugins compatible with sos 4.3
  (PR[#3922](https://github.com/scality/metalk8s/pull/3922))

## Release 124.0.1

### Bug fixes 

- Actually bump the alpine base image used by `metalk8s-alert-logger`
  image to `alpine:3.16.2` (this one was wrongly marked as upgraded
  in [124.0.0](https://github.com/scality/metalk8s/releases/124.0.0)
  changelog)
  (PR[#3909](https://github.com/scality/metalk8s/pull/3909))
- Do not attempt to provision Volumes in highstate (this avoids breaking when
  device paths have changed between reboots)
  (PR[#3913](https://github.com/scality/metalk8s/pull/3913))

## Release 124.0.0

### Additions

- Add `metalk8s-operator` to manage Workload Plane Ingress virtual IPs
  (PR[#3864](https://github.com/scality/metalk8s/pull/3864))

- Add default `topology.kubernetes.io/region` and `topology.kubernetes.io/zone`
  topology labels on nodes
  (PR[#3897](https://github.com/scality/metalk8s/pull/3897))

- Add support for a `metalk8s.scality.com/force-lvcreate` annotation on `Volume`
  objects of type `LVMLogicalVolume` to force the creation of their LV (use with
  caution) (PR[#3877](https://github.com/scality/metalk8s/pull/3877))

  _Note: this is only needed for RHEL 8 or Rocky Linux 8, LVM versions provided
  on CentOS 7 and RHEL 7 ignore previous signatures on LV creation._

### Removals

- The deprecated long name `--archive` for the "add" option to the `iso-manager.sh`
  script is removed in favor of `--add-archive` (shorthand `-a` is still valid).
  (PR[#3839](https://github.com/scality/metalk8s/pull/3839))

### Enhancements

- Bump Kubernetes version to
  [1.24.6](https://github.com/kubernetes/kubernetes/releases/tag/v1.24.6)
  (PR[#3870](https://github.com/scality/metalk8s/pull/3870))

- Bump etcd version to [3.5.3](https://github.com/etcd-io/etcd/releases/tag/v3.5.3)
  (PR[#3832](https://github.com/scality/metalk8s/pull/3832))

- No longer use deprecated field `loadBalancerIP` for LoadBalancer service
  (PR[#3834](https://github.com/scality/metalk8s/pull/3834))

- Bump Node.js version to 16.14.0 and improve UI initial load time
  (PR[#3745](https://github.com/scality/metalk8s/pull/3745))

- Bump containerd to [1.6.8](https://github.com/containerd/containerd/releases/tag/v1.6.8)
  The pause image has been bump to 3.8
  (PR[#3881](https://github.com/scality/metalk8s/pull/3881))

- Bump Calico version to [3.24.1](https://github.com/projectcalico/calico/releases/tag/v3.24.1)
  (PR[#3884](https://github.com/scality/metalk8s/pull/3884))

- Bump Prometheus Adapter chart version to
  [3.4.0](https://github.com/prometheus-community/helm-charts/releases/tag/prometheus-adapter-3.4.0)
  The prometheus-adapter image has been bumped accordingly to
  [v0.10.0](https://github.com/kubernetes-sigs/prometheus-adapter/releases/tag/v0.10.0)
  (PR[#3878](https://github.com/scality/metalk8s/pull/3878))

- Bump ingress-nginx chart version to
  [4.2.5](https://github.com/kubernetes/ingress-nginx/releases/tag/helm-chart-4.2.5)
  The controller image has been bumped accordingly to
  [v1.3.1](https://github.com/kubernetes/ingress-nginx/releases/tag/controller-v1.3.1)
  (PR[#3879](https://github.com/scality/metalk8s/pull/3879))

- Bump Dex chart version to [0.11.1](https://github.com/dexidp/helm-charts/releases/tag/dex-0.11.1),
  Dex image has been bumped accordingly to
  [v2.34.0](https://github.com/dexidp/dex/releases/tag/v2.34.0)
  (PR[#3882](https://github.com/scality/metalk8s/pull/3882))

- Bump nginx image to [1.23.1-alpine](https://github.com/nginx/nginx/releases/tag/release-1.23.1)
  (PR[#3886](https://github.com/scality/metalk8s/pull/3886))

- Bump the rocky base image used by `salt-master` and `metalk8s-utils`
  images to `rockylinux:8.6.20227707`
  (PR[#3887](https://github.com/scality/metalk8s/pull/3887))

- Bump the alpine base image used by `metalk8s-alert-logger`
  image to `alpine:3.16.2`
  (PR[#3888](https://github.com/scality/metalk8s/pull/3888))

### Bug fixes

- Fix an issue in the package availability check from bootstrap script
  that make it not checking anything
  (PR[#3898](https://github.com/scality/metalk8s/pull/3898))

- No longer include unnecessary packages in the MetalK8s internal
  repositories
  (PR[#3898](https://github.com/scality/metalk8s/pull/3898))

## Release 123.0.5 (in development)

## Release 123.0.4

### Enhancements

- Allow to manage number of replicas and, soft and hard `podAntiAffinity`
  for MetalK8s UI from Cluster and Services Configurations, with
  by default 2 replicas and soft anti-affinity on hostname, so that if
  it's possible each MetalK8s UI pods will sit on a different infra node
  (PR[#3848](https://github.com/scality/metalk8s/pull/3848))

- Ensure that on RHEL 8 based OS, packages installed by MetalK8s
  are marked as "installed by user" so that they do not get removed
  as "unused dependencies"
  (PR[#3850](https://github.com/scality/metalk8s/pull/3850))

- Retry on containerd ready check, so that we avoid wrong failure
  when containerd take a bit of time to start
  (PR[#3853](https://github.com/scality/metalk8s/pull/3853))

### Bug fixes

- Enforce `runc` version lock so that we ensure that it do not get
  "wrongly" updated after installation
  (PR[#3849](https://github.com/scality/metalk8s/pull/3849))

- Fix a bug on RHEL 8 based OS, where the `kubelet` package get
  removed during the post-upgrade step
  (PR[#3850](https://github.com/scality/metalk8s/pull/3850))

- Always set `NO_PROXY` for containerd for internal IPs
  (PR[#3852](https://github.com/scality/metalk8s/pull/3852))

- Fix a bug that may break salt-minion upgrade as the salt-minion
  restart was not run as the last step of salt-minion upgrade state
  (PR[#3854](https://github.com/scality/metalk8s/pull/3854))

## Release 123.0.3

### Enhancements

- Add default fluent-bit pod memory limits to 1Gi and add
  ability to change the fluent-bit pod resources request
  and limits
  (PR[#3845](https://github.com/scality/metalk8s/pull/3845))

### Bug fixes

- Restrict runc version in containerd dependency to avoid issues with "exec"
  introduced in runc 1.1.3
  (PR[#3846](https://github.com/scality/metalk8s/pull/3846))

## Release 123.0.2

### Bug fixes

- UI: Make sure that K8S client is reinitialised when the access
  token is renewed
  (PR[#3841](https://github.com/scality/metalk8s/pull/3841))

- Remove invalid warning message when using non-deprecated flag
  from the`iso-manager.sh` script
  (PR[#3835](https://github.com/scality/metalk8s/pull/3835))

## Release 123.0.1

### Bug fixes

- [#3827](https://github.com/scality/metalk8s/issues/3827)
  Handle an issue with duplicate pods in CRI during a static pod update,
  preventing upgrades to 123.0.0 when using an inconsistent registry HA setup
  (PR[#3828](https://github.com/scality/metalk8s/pull/3828))

## Release 123.0.0

### Additions

- Add ability to deploy MetalK8s without Dex and possibility to configure
  your own IDP for kube-apiserver, Grafana and MetalK8s UI
  (PR[#3688](https://github.com/scality/metalk8s/pull/3688))

- Add ability to change the portmap CIDRs, so that Workload Plane
  Ingress could be exposed on a different IP
  (PR[#3755](https://github.com/scality/metalk8s/pull/3755))

- Add ability to change the nodeport CIDRs, so that NodePort
  services could be exposed on a different IP
  (PR[#3807](https://github.com/scality/metalk8s/pull/3807))

- Add the [`iftop`](http://www.ex-parrot.com/pdw/iftop/) tool to the
  `metalk8s-utils` container
  (PR[#3773](https://github.com/scality/metalk8s/pull/3773))

- Add a `-r`/`--rm-archive` option to the `iso-manager.sh` script, allowing to
  remove MetalK8s ISOs from a cluster
  (PR[#3730](https://github.com/scality/metalk8s/pull/3730))

- Allow, from the Bootstrap configuration, to manage the maximum
  number of pods that can be scheduled on each nodes
  (PR[#3821](https://github.com/scality/metalk8s/pull/3821))

- Add support for [Rocky Linux](https://rockylinux.org/) version 8
  (PR[#3686](https://github.com/scality/metalk8s/pull/3686))

### Removals

- The `Statefulsets` Grafana dashboard has been removed
  (PR[#3763](https://github.com/scality/metalk8s/pull/3763))

- Remove the [`jnettop`](https://sourceforge.net/projects/jnettop/) tool from
  the `metalk8s-utils` container
  (PR[#3773](https://github.com/scality/metalk8s/pull/3773))

- Remove the `calico-cni-plugin` RPM package and rely instead on
  the `calico-cni` container to deploy the CNI binaries on the host
  (PR[#3793](https://github.com/scality/metalk8s/pull/3793))

### Deprecations

- The long name `--archive` for the "add" option to the `iso-manager.sh` script
  is deprecated in favor of `--add-archive` (shorthand `-a` is still valid).
  This deprecated option will be removed in MetalK8s 124.0.0
  (PR[#3730](https://github.com/scality/metalk8s/pull/3730))

### Bug fixes

- Automatically restart `kubelet` on `kube-apiserver` manifest change if the
  static Pod isn't restarted
  (PR[#3818](https://github.com/scality/metalk8s/pull/3818))

### Enhancements

- Bump Kubernetes version to
  [1.23.8](https://github.com/kubernetes/kubernetes/releases/tag/v1.23.8)
  (PR[#3812](https://github.com/scality/metalk8s/pull/3812))

- Bump etcd version to [3.5.1](https://github.com/etcd-io/etcd/releases/tag/v3.5.1)
  (PR[#3634](https://github.com/scality/metalk8s/pull/3634))

- Bump CoreDNS version to [v1.8.6](https://github.com/coredns/coredns/releases/tag/v1.8.6)
  (PR[#3634](https://github.com/scality/metalk8s/pull/3634))

- Bump containerd to [1.6.4](https://github.com/containerd/containerd/releases/tag/v1.6.4)
  The pause image has been bump to 3.7
  (PR[#3778](https://github.com/scality/metalk8s/pull/3778))

- Bump Calico version to [3.23.1](https://github.com/projectcalico/calico/releases/tag/v3.23.1)
  (PR[#3771](https://github.com/scality/metalk8s/pull/3771))

- Allow to resolve the registry endpoint from inside containers using CoreDNS
  (PR[#3690](https://github.com/scality/metalk8s/pull/3690))

- Bump kube-prometheus-stack charts version to
  [35.3.1](https://github.com/prometheus-community/helm-charts/releases/tag/kube-prometheus-stack-35.3.1)
  The following images have also been bumped accordingly:
   - alertmanager to [v0.24.0](https://github.com/prometheus/alertmanager/releases/tag/v0.24.0)
   - k8s-sidecar to [1.15.6](https://github.com/kiwigrid/k8s-sidecar/releases/tag/1.15.6)
   - grafana to [8.5.0-ubuntu](https://github.com/grafana/grafana/releases/tag/v8.4.7)
   - kube-state-metrics to [v2.4.1](https://github.com/kubernetes/kube-state-metrics/releases/tag/v2.4.1)
   - node-exporter to [v1.3.1](https://github.com/prometheus/node_exporter/releases/tag/v1.3.1)
   - prometheus to [v2.35.0](https://github.com/prometheus/prometheus/releases/tag/v2.35.0)
   - prometheus-config-reloader to [v0.56.2](https://github.com/prometheus-operator/prometheus-operator/releases/tag/v0.56.2)
   - prometheus-operator to [v0.56.2](https://github.com/prometheus-operator/prometheus-operator/releases/tag/v0.56.2)
   - thanos to [v0.25.2](https://github.com/thanos-io/thanos/releases/tag/v0.25.2)
   This new version also come with Grafana metrics and a dashboard to
   monitor Grafana
  (PR[#3763](https://github.com/scality/metalk8s/pull/3763))

- Bump Prometheus Adapter chart version to
  [3.2.2](https://github.com/prometheus-community/helm-charts/releases/tag/prometheus-adapter-3.2.2)
  The prometheus-adapter image has been bumped accordingly to
  [v0.9.1](https://github.com/kubernetes-sigs/prometheus-adapter/releases/tag/v0.9.1)
  (PR[#3760](https://github.com/scality/metalk8s/pull/3760))

- Bump ingress-nginx chart version to
  [4.1.2](https://github.com/kubernetes/ingress-nginx/releases/tag/helm-chart-4.1.2)
  The controller image has been bumped accordingly to
  [v1.2.0](https://github.com/kubernetes/ingress-nginx/releases/tag/controller-v1.2.0)
  (PR[#3779](https://github.com/scality/metalk8s/pull/3779))

- Bump Loki chart version to
  [2.11.1](https://github.com/grafana/helm-charts/releases/tag/loki-2.11.1)
  The Loki image has been bumped accordingly to
  [2.5.0](https://github.com/grafana/loki/releases/tag/v2.5.0)
  (PR[#3762](https://github.com/scality/metalk8s/pull/3762))

- Migrate from grafana fluent-bit deprecated chart to fluent-bit fluent chart
  version [0.19.19](https://github.com/fluent/helm-charts/releases/tag/fluent-bit-0.19.19)
  The fluent-bit-plugin-loki image has been changed accordingly to fluent-bit
  version [1.8.12](https://github.com/fluent/fluent-bit/releases/tag/v1.8.12)
  (PR[#3709](https://github.com/scality/metalk8s/pull/3709))

- Bump MetalLB chart version to
  [3.0.6](https://artifacthub.io/packages/helm/bitnami/metallb/3.0.6)
  The following images have also been bumped accordingly:
  - metallb-controller to [0.12.1-debian-10-r89](https://github.com/bitnami/bitnami-docker-metallb-controller/releases/tag/0.12.1-debian-10-r89)
  - metallb-speaker to [0.12.1-debian-10-r90](https://github.com/bitnami/bitnami-docker-metallb-speaker/releases/tag/0.12.1-debian-10-r90)
  (PR[#3777](https://github.com/scality/metalk8s/pull/3777))

- Bump nginx image to [1.21.6-alpine](https://github.com/nginx/nginx/releases/tag/release-1.21.6)
  (PR[#3710](https://github.com/scality/metalk8s/pull/3710))

- Change base image from `centos:7.9.2009` to `rockylinux:8.5.20220308` for the
  `metalk8s-utils` container
  (PR[#3773](https://github.com/scality/metalk8s/pull/3773))

- Change base image from `centos:7.6.1810` to `rockylinux:8.5.20220308` for the
  `salt-master` container
  (PR[#3773](https://github.com/scality/metalk8s/pull/3773))

 - Bump Salt version to [3002.9](https://github.com/saltstack/salt/blob/v3002.9/doc/topics/releases/3002.9.rst)
  (PR[#3811](https://github.com/scality/metalk8s/pull/3811))

- Bump Dex chart version to [0.8.2](https://artifacthub.io/packages/helm/dex/dex/0.8.2),
  Dex image has been bumped accordingly to
  [v2.31.2](https://github.com/dexidp/dex/releases/tag/v2.31.2)
  (PR[#3765](https://github.com/scality/metalk8s/pull/3765))

## Release 2.11.9 (in development)

## Release 2.11.8
### Bug fixes

- Properly exit on failure during upgrade and downgrade
  (PR[#3790](https://github.com/scality/metalk8s/pull/3790))

### Enhancements

 - Bump Salt version to 3002.9
  (PR[#3815](https://github.com/scality/metalk8s/pull/3815))

## Release 2.11.7
### Enhancements

- Allow to set Control Plane Ingress IP to an external IP (like
  a load balancer IP)
  (PR[#3752](https://github.com/scality/metalk8s/pull/3752))

- Bump metalk8s-alert-logger base image to `alpine:3.13.10`
  (PR[#3758](https://github.com/scality/metalk8s/pull/3758))

## Release 2.11.6
### Enhancements

 - Bump Salt version to 3002.8
  (PR[#3744](https://github.com/scality/metalk8s/pull/3744))

## Release 2.11.5
### Enhancements

- Make Loki pod resources configurable
  (PR[#3737](https://github.com/scality/metalk8s/pull/3737))

### Bug fixes

- Fix MetalK8s sosreport plugin so that it properly retrieve namespaces
  (PR[#3740](https://github.com/scality/metalk8s/pull/3740))

- Fix an issue that, if the upgrade fail at some point, you may be
  left with no solutions Images available from the internal registry
  (PR[#3741](https://github.com/scality/metalk8s/pull/3741))

- Enable `initial-corrupt-check` for etcd in order to try
  to avoid data inconsistency issue in etcd
  (PR[#3742](https://github.com/scality/metalk8s/pull/3742))

## Release 2.11.4
### Bug fixes

- Downgrade Kubernetes version to 1.22.4 in order to avoid a regression
  about static pod restart
  (PR[#3731](https://github.com/scality/metalk8s/pull/3731))

- Make kube-proxy listening only on the Control Plane IP
  (PR[#3732](https://github.com/scality/metalk8s/pull/3732))

## Release 2.11.3
### Enhancements

- Bump Kubernetes version to 1.22.8
  (PR[#3726](https://github.com/scality/metalk8s/pull/3726))

- Add some missing alerts in the alerts hierarchy
  (PR[#3714](https://github.com/scality/metalk8s/pull/3714))

### Bug fixes

- Fix a bug during the upgrade that makes the workload plane Ingress controller
  ignore the Ingress object that does not have the class explicitly set
  (PR[#3704](https://github.com/scality/metalk8s/pull/3704))

- Fix a bug during the upgrade that remove the Loki instance services used by
  Grafana datasources
  (PR[#3717](https://github.com/scality/metalk8s/pull/3717))

- Fix a bug during the upgrade that block the eviction of the Control Plane Ingress
  controller Pod
  (PR[#3724](https://github.com/scality/metalk8s/pull/3724))

- [#2166](https://github.com/scality/metalk8s/issues/2166) - Make
  Prometheus node exporter listening only on the Control Plane IP
  (PR[#3725](https://github.com/scality/metalk8s/pull/3725))

## Release 2.11.2
### Bug fixes

- Downgrade ingress-nginx chart version to 4.0.6
  nginx-ingress-controller image has been downgraded accordingly to v1.0.4
  in order to fix regression about `nginx.ingress.kubernetes.io/server-snippet`
  ingress annotation
  (PR[#3694](https://github.com/scality/metalk8s/pull/3694))

## Release 2.11.1
### Enhancements

- Add each Loki instance as datasources in Grafana dashboards
  (PR[#3681](https://github.com/scality/metalk8s/pull/3681))

- Bump Grafana image version to 8.3.4-ubuntu
  (PR[#3684](https://github.com/scality/metalk8s/pull/3684))

- Bump ingress-nginx chart version to 4.0.9
  nginx-ingress-controller image has been bumped accordingly to v1.0.5
  (PR[#3691](https://github.com/scality/metalk8s/pull/3691))

### Bug fixes

- Disable fluent-bit service monitor as currently the fluent-bit
  HTTP server that serve metrics does not work
  (PR[#3689](https://github.com/scality/metalk8s/pull/3689))

- Fix the incomplete alert name in MetalK8s UI alert page
  (PR[#3669](https://github.com/scality/metalk8s/pull/3669))

### Breaking changes

- [#2199](https://github.com/scality/metalk8s/issues/2199) - Prometheus label
  selector for `PodMonitor` has changed from `release: prometheus-operator` to
  `metalk8s.scality.com/monitor: ''`
  (PR[#3692](https://github.com/scality/metalk8s/pull/3692))

## Release 2.11.0
### Additions

- Deploy a hierarchy of Prometheus alerts to provide different granularities
  when observing the cluster state (used in the UI Dashboard page)
  (PR[#3540](https://github.com/scality/metalk8s/pull/3540))

- [#3574](https://github.com/scality/metalk8s/issues/3574) - Allow to manage
  number of replicas and, soft and hard `podAntiAffinity` for `CoreDNS`
  from Bootstrap configuration file, with a default soft anti-affinity on
  hostname, so that if it's possible each `CoreDNS` pods will sit on different infra node
  (PR[#3579](https://github.com/scality/metalk8s/pull/3579))

- Allow to manage number of replicas and, soft and hard `podAntiAffinity`
  for Control Plane Ingress Controller from Bootstrap configuration file, with
  a default soft anti-affinity on hostname, so that if it's possible each
  Control Plane Ingress Controller pods will sit on a different master node
  (PR[#3617](https://github.com/scality/metalk8s/pull/3617))

- Allow to manage soft and hard `podAntiAffinity` for `Dex` from Cluster
  and Services Configurations, with a default soft anti-affinity on hostname,
  so that if it's possible each `Dex` pods will sit on a different infra node
  (PR[#3614](https://github.com/scality/metalk8s/pull/3614))

- Allow to manage the number of terminated pods that can exist, before the
  terminated pod garbage collector starts deleting them, from the
  Bootstrap configuration. It defaults to `500`
  (PR[#3621](https://github.com/scality/metalk8s/pull/3621))

### Removals

- Removed the PDF support for documentation, replaced it with the HTML output
  in the ISO (PR[#3540](https://github.com/scality/metalk8s/pull/3540))

### Enhancements

- Bump Kubernetes version to 1.22.4
  (PR[#3608](https://github.com/scality/metalk8s/pull/3608))

- Bump etcd version to 3.5.0-0
  (PR[#3525](https://github.com/scality/metalk8s/pull/3525))

- Bump CoreDNS version to v1.8.4
  (PR[#3525](https://github.com/scality/metalk8s/pull/3525))

- Bump `containerd` version to 1.5.8
  (PR[#3648](https://github.com/scality/metalk8s/pull/3648)).

- Bump Calico version to 3.20.0
  (PR[#3527](https://github.com/scality/metalk8s/pull/3527))

- Bump ingress-nginx chart version to 4.0.1
  nginx-ingress-controller image has been bumped accordingly to v1.0.0
  (PR[#3518](https://github.com/scality/metalk8s/pull/3518))

- Bump Dex chart version to v0.6.3, Dex image has been bumped accordingly
  to v2.30.0
  (PR[#3519](https://github.com/scality/metalk8s/pull/3519))

- Bump kube-prometheus-stack charts version to 23.2.0
  The following images have also been bumped accordingly:
   - grafana to 8.3.1-ubuntu
   - k8s-sidecar to 1.14.2
   - kube-state-metrics to v2.2.4
   - node-exporter to v1.2.2
   - prometheus to v2.31.1
   - prometheus-config-reloader to v0.52.1
   - prometheus-operator to v0.52.1
  (PR[#3639](https://github.com/scality/metalk8s/pull/3639))

- [#3487](https://github.com/scality/metalk8s/issues/3487) - Make Salt
  Kubernetes execution module more flexible relying on `DynamicClient`
  from `python-kubernetes`
  (PR[#3510](https://github.com/scality/metalk8s/pull/3510))

- Add Dashboard page to monitor the health and performances of the cluster
  in MetalK8s UI
  (PR[#3551](https://github.com/scality/metalk8s/pull/3551),
  PR[#3522](https://github.com/scality/metalk8s/pull/3522),
  PR[#3465](https://github.com/scality/metalk8s/pull/3465),
  PR[#3420](https://github.com/scality/metalk8s/pull/3420),
  PR[#3501](https://github.com/scality/metalk8s/pull/3501))

- Deploy Thanos querier in front of Prometheus in order to make metrics
  highly-available when we have multiple Prometheus instances
  (PR[#3573](https://github.com/scality/metalk8s/pull/3573))

- Handle 401 unauthorized error in MetalK8s UI
  (PR[#3640](https://github.com/scality/metalk8s/pull/3640))
  
- [#3618](https://github.com/scality/metalk8s/issues/3618) Detect Grafana
  dashboard ConfigMaps in any namespace rather than just `metalk8s-monitoring`,
  and enable Grafana folder generation from dashboard file structure (PR
  [#3620](https://github.com/scality/metalk8s/pull/3620))

- [#3387](https://github.com/scality/metalk8s/issues/3387) - Make
  metalk8s-sosreport package compatible with sos version 4.0+
  (PR[#3664](https://github.com/scality/metalk8s/pull/3664))

- Explicitly set the Grafana datasource UID to `metalk8s-<datasource_name>`
  (PR[#3668](https://github.com/scality/metalk8s/pull/3668))

- Do not use `cluster.local` suffix in Loki datasources
  (PR[#3679](https://github.com/scality/metalk8s/pull/3679))

## Bug fixes

- [#3601](https://github.com/scality/metalk8s/issues/3601) - Marks
  the `pause` image used by `containerd` as `pod infra container image`
  so that kubelet does not remove it
  (PR[#3624](https://github.com/scality/metalk8s/pull/3624))

- Do not fail if the Control Plane Ingress section exists in the
  Bootstrap configuration file, but Ingress IP is not set.
  (PR[#3675](https://github.com/scality/metalk8s/pull/3675))

## Release 2.10.9 (in development)
## Bug fixes

- Filter out some filesystem (NSFS, iso9660) from node exporter since
  metrics for those filesystem does not bring any value
  (PR[#3661](https:github.com/scality/metalk8s/pull/3661))

## Release 2.10.8
## Enhancements

- Bump Kubernetes version to 1.21.8
  (PR[#3653](https://github.com/scality/metalk8s/pull/3653))

- Bump ingress-nginx chart version to 3.36.0
  nginx-ingress-controller image has been bump accordingly to v0.49.3
  (PR[#3649](https://github.com/scality/metalk8s/pull/3649))

- Bump grafana image to 8.0.7-ubuntu
  (PR[#3656](https://github.com/scality/metalk8s/pull/3656))

## Bug fixes

- Fix display of volume usage on newly created volumes in
  MetalK8s Web UI
  (PR[#3651](https://github.com/scality/metalk8s/pull/3651))

## Release 2.10.7
## Enhancements

- Skip "Pending" pods when draining a node
  (PR[#3641](https://github.com/scality/metalk8s/pull/3641))

## Release 2.10.6
## Enhancements

- Bump Kubernetes version to 1.21.7
  (PR[#3607](https://github.com/scality/metalk8s/pull/3607))

- Add ability to change the drain timeout from the upgrade and
  downgrade scripts and default to 3600 seconds
  (PR[#3633](https://github.com/scality/metalk8s/pull/3633))

## Bug fixes

- [#3341](https://github.com/scality/metalk8s/issues/3341) - Try to refresh
  udev database automatically if a Volume persistent path does not exist
  (PR[#3630](https://github.com/scality/metalk8s/pull/3630))
- Fix wrong average value in Control Plane and Workload Plane Bandwidth chart
  (PR[#3616](https://github.com/scality/metalk8s/pull/3616))
- Fix no data displayed within the tooltip of UI chart when
  Node name contains more than 1 dots
  (PR[#3629](https://github.com/scality/metalk8s/pull/3629))

## Release 2.10.5
## Enhancements

- Bump Kubernetes version to 1.21.6
  (PR[#3583](https://github.com/scality/metalk8s/pull/3583))

## Bug fixes

- [#3570](https://github.com/scality/metalk8s/issues/3570) - Fix the upgrade
  script, so that it does not exit 1 just after the initial backup creation
  (PR[#3571](https://github.com/scality/metalk8s/pull/3571))

- Fix a bug in MetalK8s UI that sometimes display the metrics of the
  previously selected instance when switching between them
  (PR[#3580](https://github.com/scality/metalk8s/pull/3580))

- Fix the backup replication Job name which was including the node name,
  so that he could exceed the limit of 63 characters.
  (PR[#3584](https://github.com/scality/metalk8s/pull/3584))

- Fluent-bit instances stayed stuck when a Loki instance was down, blocking
  the whole logging pipeline. It is now fixed as we configure fluent-bit to
  talk with Loki's service and use memberlist to keep the Loki instances
  replicated.
  (PR[#3557](https://github.com/scality/metalk8s/pull/3557))

- Properly handle `generateName` in our Salt Kubernetes module
  (PR[#3590](https://github.com/scality/metalk8s/pull/3590))

## Release 2.10.4
## Bug fixes

- [#3564](https://github.com/scality/metalk8s/issues/3564) - Fix a bug that
  prevents running salt states using salt-ssh if the target node has some
  MetalK8s volumes
  (PR[#3566](https://github.com/scality/metalk8s/pull/3566))

### Features Added

- A daily backup of the bootstrap node is now automatically scheduled.
  All the backups are also replicated onto all the master nodes.
  (PR [#3557](https://github.com/scality/metalk8s/pull/3557))

## Release 2.10.3
### Enhancements

- Bump Kubernetes version to 1.21.5
  (PR[#3537](https://github.com/scality/metalk8s/pull/3537))

- Bump Salt version to 3002.7
  (PR [#3524](https://github.com/scality/metalk8s/pull/3524))

- Improve UI metrics charts (cursor synchronisation when hovering a chart, better tooltip with coloured legend and unit, lot of bug fixes when data is missing, symmetrical charts to compare read/write in/out metrics) (PR[#3529](https://github.com/scality/metalk8s/pull/3529))

## Bug fixes

- Enforce a single subnet for control plane when using a
  MetalLB-managed VIP for Ingress
  (PR [#3533](https://github.com/scality/metalk8s/pull/3533))

- Fix UI issues in multi nodes environment when a node
  is unavailable (PR[#3521](https://github.com/scality/metalk8s/pull/3521))

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
