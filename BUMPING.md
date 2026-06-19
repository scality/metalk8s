# Bumping MetalK8s dependencies

Here is a short list of chart and component bumps and how to perform them

## Charts

### fluent-bit

```
CHART_NAME=fluent-bit
REPO_NAME=fluent
REPO_URL=https://fluent.github.io/helm-charts
```

### cert-manager

```
CHART_NAME=cert-manager
REPO_NAME=jetstack
REPO_URL=https://charts.jetstack.io
```

### dex

```
CHART_NAME=dex
REPO_NAME=dex
REPO_URL=https://charts.dexidp.io
```

Before generating the sls, the chart file `charts/dex/templates/ingress.yaml` needs
to be patched as so (after line 3):

```
{{- $svcPort := .Values.service.ports.http.port -}}
# add these 3 lines
{{- if .Values.https.enabled -}}
  {{- $svcPort = .Values.service.ports.https.port -}}
{{- end }}
```
(cf. [opened issue](https://github.com/dexidp/helm-charts/issues/15))

### loki

```
CHART_NAME=loki
REPO_NAME=grafana
REPO_URL=https://grafana.github.io/helm-charts
```

### ingress-nginx

```
CHART_NAME=ingress-nginx
REPO_NAME=ingress-nginx
REPO_URL=https://kubernetes.github.io/ingress-nginx
```

set `$VERSION` with the appropriate value.

run

```
curl https://raw.githubusercontent.com/kubernetes/ingress-nginx/refs/tags/controller-$VERSION/deploy/grafana/dashboards/nginx.json \
  -Lo salt/metalk8s/addons/nginx-ingress/deployed/files/ingress-nginx.json
curl https://raw.githubusercontent.com/kubernetes/ingress-nginx/refs/tags/controller-$VERSION/deploy/grafana/dashboards/request-handling-performance.json \
  -Lo salt/metalk8s/addons/nginx-ingress/deployed/files/ingress-nginx-performance.json
```

### prometheus-adapter

```
CHART_NAME=prometheus-adapter
REPO_NAME=prometheus-community
REPO_URL=https://prometheus-community.github.io/helm-charts
```

### kube-prometheus-stack

```
CHART_NAME=kube-prometheus-stack
REPO_NAME=prometheus-community
REPO_URL=https://prometheus-community.github.io/helm-charts
```

NB: thanos chart is updated at the same time

After the first failed build, rules.json and alerting_rules.json from
`$ARTIFACTS_URL/alert_rules` and place them in `tools/rule_extractor` folder.

### thanos

```
CHART_NAME=thanos
REPO_NAME=bitnami
REPO_URL=https://charts.bitnami.com/bitnami
```

### General Outline

All charts are in the `charts/` directory, they are usually represented
in one file and one directory:

 - `$CHART_NAME/` contains the untouched chart files fetched using helm.
 - `$CHART_NAME.yaml` our personalized helm values file.

In order to Bump this chart, one has to:

 - remove the current chart files:
   ```rm -rf charts/$CHART_NAME/```
 - add the chart's repo using helm:
   ```helm repo add $REPO_NAME $REPO_URL && helm repo update```
 - fetch the repo again:
   ```helm fetch -d charts --untar $REPO_NAME/$CHART_NAME```
 - make any necessary patches to the chart (chart-specific).

## Images

A few tips to bump image versions and SHAs:

 - we can find the desired image version in the chart.
 - bumps are done in the file `buildchain/buildchain/versions.py`.
 - the registry for an image can be found by parsing `constants.py` and `image.py`.
 - when the registry is known, the SHA for the new version can be fetched:
   ```gcrane digest $registry/$image:$tag```

## Operator-sdk and Go version

This guide is applied for both `metalk8s-operator` and `storage-operator`.

### Prerequisites

- `go`, `curl`, and `patch` in `PATH`.
- `pyyaml` Python package: `pip install pyyaml`
- `GITHUB_TOKEN` (optional): raises the GitHub API rate limit from 60 to 5000
  req/hour. Set via `export GITHUB_TOKEN=<token>`.

### Updating the versions

Target versions are pinned in `tools/upgrade-operator-sdk/<name>/config.yaml`:

```yaml
operator_sdk_version: v1.42.1    # target operator-sdk release
go_toolchain: go1.24.13          # pin Go toolchain (for GOTOOLCHAIN)
k8s_libs: v0.33.10               # pin k8s.io libs version
```

After scaffolding, the script detects the latest available versions (operator-sdk
from GitHub, Go and k8s.io patches from go.dev / module proxy) and compares with
the pinned values:

- **No pin** in YAML: the detected version is used and auto-pinned in the file.
- **Pin matches detected**: all good, no action.
- **Pin is older** than detected: warning printed with the newer version available.
  The pinned value is still used. Update the YAML manually when ready.
- **Pin is newer** than detected (unusual): warning, the detected value is used.

This is CI-friendly: zero interactive input during reconciliation.

### Running the upgrade

The script processes one operator at a time:

```bash
python3 tools/upgrade-operator-sdk/upgrade.py \
    --operator-dir operator \
    --config-dir tools/upgrade-operator-sdk/operator

python3 tools/upgrade-operator-sdk/upgrade.py \
    --operator-dir storage-operator \
    --config-dir tools/upgrade-operator-sdk/storage-operator
```

Options:

```
--operator-dir    Path to the operator project directory (required)
--config-dir      Path to the upgrade config directory (required)
--skip-backup     Reuse an existing .bak directory (no new backup)
--clean-tools     Remove tool cache after upgrade
--yes, -y         Skip the confirmation prompt
```

### YAML config files

Each operator has a config directory at `tools/upgrade-operator-sdk/<name>/` containing
`config.yaml` and a `patches/` subdirectory. The config fields are:

- **Versions**: `operator_sdk_version`, `go_toolchain` (optional pin), `k8s_libs` (optional pin)
- **Scaffold**: `repo`, `domain`, `apis` (with `group`, `version`, `kind`, `namespaced`). The operator name is derived from the config directory name.
- **Raw copy**: `raw_copy` -- directories or files copied as-is from backup (purely custom code with no scaffold equivalent: `pkg/`, `version/`, `config/metalk8s/`, `salt/`, individual test/helper files)
- **Post-processing**: `extra_commands`

### Patch files

All customizations to scaffold-generated files are stored as GNU unified diff
files in the `patches/` subdirectory. This includes:

- **Dockerfile** and **Makefile** customizations
- **CRD type definitions** (`*_types.go`)
- **Controller implementations** (`*_controller.go`)
- **Scaffold test stubs** (`*_controller_test.go`) -- neutralized when incompatible with the delegation pattern

The script applies them with `patch -p1` after scaffolding. If a patch does not
apply cleanly, look for `.rej` files and resolve manually.

Patch files use `__PLACEHOLDER__` tokens for runtime values:

| Placeholder       | Replaced with                | Source     |
| ----------------- | ---------------------------- | ---------- |
| `__GOTOOLCHAIN__` | Detected/pinned Go toolchain | `Makefile` |

New `.patch` files in the patches directory are automatically picked up.

### What to review after the upgrade

1. `git diff` to review all changes
2. `cd <operator> && make test` to run tests
3. Check `config/crd/bases/` for correct CRD scopes
4. Check `config/rbac/role.yaml` for RBAC completeness
5. Check `deploy/manifests.yaml` for correct Jinja templates
6. Remove backup: `rm -rf <operator>.bak/`

## Calico

Calico does not use a Helm chart. The manifest is maintained directly as a
Jinja-templated Salt state with MetalK8s-specific patches applied on top of the
upstream manifest.

### 1. Update versions and digests in `buildchain/buildchain/versions.py`

Change `CALICO_VERSION` and update the digests for the three images
(`calico-cni`, `calico-node`, `calico-kube-controllers`):

```python
CALICO_VERSION: str = "3.X.Y"
```

Fetch digests with `gcrane`:

```sh
gcrane digest quay.io/calico/cni:v3.X.Y
gcrane digest quay.io/calico/node:v3.X.Y
gcrane digest quay.io/calico/kube-controllers:v3.X.Y
```

### 2. Discover which patches need to be reapplied

The safest approach is to diff the **previous upstream manifest** against
`deployed.sls` to extract all MetalK8s patches, then apply them onto the
**new** upstream manifest.

```sh
# Download both the old and new upstream manifests
OLD=v3.OLD
NEW=v3.X.Y
curl -sL https://github.com/projectcalico/calico/raw/${OLD}/manifests/calico.yaml -o /tmp/calico-${OLD}.yaml
curl -sL https://github.com/projectcalico/calico/raw/${NEW}/manifests/calico.yaml -o /tmp/calico-${NEW}.yaml

# See what MetalK8s changed vs upstream (ignore line-number noise with -U0)
diff -u /tmp/calico-${OLD}.yaml salt/metalk8s/kubernetes/cni/calico/deployed.sls
```

### 3. Update the manifest

Copy the new upstream manifest as the new `deployed.sls`:

```sh
cp /tmp/calico-${NEW}.yaml salt/metalk8s/kubernetes/cni/calico/deployed.sls
```

Then re-apply all MetalK8s patches. The complete list of patches (all have
inline `# NOTE:` or `# Note:` comments in the file to mark them) is:

#### Jinja file header (top of file, before the first `---`)

```jinja
#!jinja | metalk8s_kubernetes

{%- from "metalk8s/repo/macro.sls" import build_image_name with context %}
{%- from "metalk8s/map.jinja" import networks with context %}

# What's below is based on the deployment manifest provided by Calico upstream.
# See a parent commit in which this file is imported as-is.
# Various changes to the original are made, based on how we deploy Calico (and
# its CNI plugins etc.) within MetalK8s.

# It comes from: https://github.com/projectcalico/calico/blob/vX.Y.Z/manifests/calico.yaml
```

#### ConfigMap `calico-config` — MTU (`veth_mtu` key)

```yaml
  # NOTE: We do not use the auto-detection mechanism as it's not acceptable in
  #       MetalK8s context
  #       see: https://github.com/projectcalico/felix/pull/2511#issuecomment-733121759
  # MTU for calico = workload MTU - 20 (for IPinIP header)
  veth_mtu: "{{ networks.workload_plane.mtu - 20 }}"
```

#### ConfigMap `calico-config` — PortMap CNI plugin (`cni_network_config` key)

Add a `# NOTE:` comment on the `cni_network_config` line, and add a
`conditionsV4` block to the `portmap` plugin entry:

```yaml
  # NOTE: Add some specific MetalK8s conditions for PortMap
  cni_network_config: |-
    ...
        {
          "type": "portmap",
          "snat": true,
          "capabilities": {"portMappings": true},
          "conditionsV4": [
            "-d",
            "{{ salt.metalk8s_network.get_portmap_ips(as_cidr=True) | join(',') }}"
          ]
        }
```

#### DaemonSet `calico-node` — pod template annotations

Add a checksum annotation so the pod restarts on ConfigMap changes:

```yaml
    metadata:
      # NOTE: Add annotation for config checksum, so that Pod get restarted on
      # ConfigMap change
      annotations:
        checksum/config: __slot__:salt:metalk8s_kubernetes.get_object_digest(kind="ConfigMap",
          apiVersion="v1", namespace="kube-system", name="calico-config", path="data")
      labels:
        k8s-app: calico-node
```

#### DaemonSet `calico-node` — `IP_AUTODETECTION_METHOD` env var

Insert after the `IP: autodetect` env var:

```yaml
            - name: IP_AUTODETECTION_METHOD
              # NOTE: Use all workload CIDRs
              value: cidr={{ networks.workload_plane.cidr | join(',') }}
```

#### DaemonSet `calico-node` — IPIP mode

Change `CALICO_IPV4POOL_IPIP` from `"Always"` to `"CrossSubnet"` and add a
comment:

```yaml
            # Note: In MetalK8s we want to use IPIP encapsulation
            #       only for cross subnet communication.
            - name: CALICO_IPV4POOL_IPIP
              value: "CrossSubnet"
```

#### DaemonSet `calico-node` — pod CIDR

Uncomment `CALICO_IPV4POOL_CIDR` and set it from the pillar:

```yaml
            - name: CALICO_IPV4POOL_CIDR
              value: "{{ networks.pod }}"
```

#### DaemonSet `calico-node` — disable usage reporting

Insert after `FELIX_HEALTHENABLED`:

```yaml
            # Note: We do not want to report about outgoing connections
            #       in Metalk8s
            - name: FELIX_USAGEREPORTINGENABLED
              value: "false"
```

#### Deployment `calico-kube-controllers` — node affinity and tolerations

Restrict the controller to master nodes and add MetalK8s taints:

```yaml
      nodeSelector:
        kubernetes.io/os: linux
        # Note: We want to tie `calico-kube-controllers` Pod on master node
        #       in MetalK8s
        node-role.kubernetes.io/master: ''
      tolerations:
        # Mark the pod as a critical add-on for rescheduling.
        - key: CriticalAddonsOnly
          operator: Exists
        - key: node-role.kubernetes.io/master
          effect: NoSchedule
        - key: node-role.kubernetes.io/control-plane
          effect: NoSchedule
        # Note: Add tolerations for MetalK8s taints
        - key: node-role.kubernetes.io/bootstrap
          effect: NoSchedule
        - key: node-role.kubernetes.io/infra
          effect: NoSchedule
```

#### Image references (all containers)

Replace every hardcoded `quay.io/calico/<name>:vX.Y.Z` with the Jinja
`build_image_name` macro. There are **5 occurrences** across the DaemonSet
init containers, main container, and the kube-controllers Deployment:

```yaml
image: {{ build_image_name('calico-cni') }}          # 2× (upgrade-ipam, install-cni)
image: {{ build_image_name('calico-node') }}         # 2× (ebpf-bootstrap, calico-node)
image: {{ build_image_name('calico-kube-controllers') }}  # 1×
```

A quick check after applying patches:

```sh
grep -c "quay.io/calico" salt/metalk8s/kubernetes/cni/calico/deployed.sls
# should output 0
grep "build_image_name" salt/metalk8s/kubernetes/cni/calico/deployed.sls
# should list 5 lines
```

## Containerd

The version just needs to be updated in `buildchain/buildchain/versions.py`.

## Update the sls state

 - git add changes because codegen need to list them.
 - generate the sls state from the chart:
   ```./doit.sh codegen:chart_$CHART_NAME```
