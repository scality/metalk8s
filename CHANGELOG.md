# CHANGELOG

## Release 2.4.4 (in development)

### Features added
- [#2561](https://github.com/scality/metalk8s/issues/2561) - install `kubectl`
on all master nodes (PR [#2562](https://github.com/scality/metalk8s/pull/2562))

### Security fixes
- Due to critical vulnerabilities (
[CVE-2020-11652](https://cve.mitre.org/cgi-bin/cvename.cgi?name=CVE-2020-11652)
and
[CVE-2020-11651](https://cve.mitre.org/cgi-bin/cvename.cgi?name=CVE-2020-11651))
with CVSS score of 10.0 that was discovered affecting all `Salt Master`
versions inferior to `3000.2`, this release ships with a `Salt Master` version
updated to `3000.3`. Users, especially those who expose the `Salt Master` to
the internet must therefore upgrade immediately.

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
python-kubernetes client to `v11`
(PR [#2554](https://github.com/scality/metalk8s/pull/2554))

- Make `etcd` expansions more resilient
(PR [#2147](https://github.com/scality/metalk8s/pull/2147))

- [#2585](https://github.com/scality/metalk8s/issues/2585) - Add state to
cleanup PrometheusRule CRs after upgrade/downgrade
(PR [#2594](https://github.com/scality/metalk8s/pull/2594))

- [#2533](https://github.com/scality/metalk8s/issues/2533) - Use dedicated
kubeconfig for Salt master
(PR [#2534](https://github.com/scality/meltalk8s/pull/2534))

### Bug fixes

- [#2444](https://github.com/scality/metalk8s/issues/2444) - Fix flaky SLS
rendering missing pillar key
(PR [#2445](https://github.com/scality/metalk8s/pull/2445))

- [#2524](https://github.com/scality/metalk8s/issues/2524) - Fix salt-minion
upgrade and downgrade
(PR [#2525](https://github.com/scality/metalk8s/pull/2525))

- [#2551](https://github.com/scality/metalk8s/issues/2551)  Fix downgrade
pre-check regarding the saltenv version
(PR [#2552](https://github.com/scality/metalk8s/pull/2552))

- [#2592](https://github.com/scality/metalk8s/issues/2592) - Fix invalid custom
object Listing in `metalk8s_kubernetes` Salt module
(PR [#2593](https://github.com/scality/metalk8s/pull/2593))

- Fix apiserver-proxy to no longer proxy to non-master nodes
(PR [#2555](https://github.com/scality/metalk8s/pull/2555))

- [#2530](https://github.com/scality/metalk8s/issues/2530) - Make cluster
upgrade more robust to PodDisruption
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
