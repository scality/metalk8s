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

**k8s-sidecar cross-dependency**: kube-prometheus-stack bundles `k8s-sidecar`
(the Grafana sidecar for dashboard/datasource discovery). The Loki chart also
uses `k8s-sidecar`, but its version is **explicitly pinned** in
`charts/loki.yaml` under `sidecar.image.tag`. When the sidecar version changes
as part of a kube-prometheus-stack bump, you must also:
1. Update the `tag:` value in `charts/loki.yaml` to match.
2. Regenerate the Loki Salt state: `./doit.sh codegen:chart_loki`

Failure to do so will cause the CI install to attempt to pull the old sidecar
image that is no longer present in the registry.

### thanos

```
CHART_NAME=thanos
REPO_NAME=bitnami
REPO_URL=https://charts.bitnami.com/bitnami
```

### node-problem-detector

```
CHART_NAME=node-problem-detector
CHART_REPOSITORY=oci://ghcr.io/deliveryhero/helm-charts
```

NB: this chart is fetched from an OCI registry instead of a classic helm repo:
```helm pull $CHART_REPOSITORY/$CHART_NAME --version <version> -d charts --untar```

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

See [BUMPING_CALICO.md](BUMPING_CALICO.md) for the full Calico bump guide.

## Containerd

The version just needs to be updated in `buildchain/buildchain/versions.py`.

## containerd-image-preload

The package comes from a release of
[image-cache](https://github.com/scality/image-cache), which attaches one RPM
per RedHat release to each of its tags. Bumping it means editing its entry in
`PREBUILT_RPMS`, in `buildchain/buildchain/versions.py`:

- `tag`, the release to fetch. The RPM version follows from it, as
  `rpm/build.sh` in image-cache derives it, and so does the version pin every
  node installs.
- every entry of `sha256`, the digest of each package. Read them off the
  release page, or run `sha256sum` on the downloaded packages.

`release` and `arch` default to `1` and `noarch`, which is what the spec ships.
Set them only if a package ever moves off those.

The build stops if a digest is missing or does not match, and names the release
it expected. A stale digest cannot ship the wrong package.

The asset name is derived from the tag, the way `rpm/build.sh` in image-cache
derives the RPM version. A prerelease tag such as `v0.2.0-rc1` builds
`0.2.0~rc1`, and GitHub replaces the tilde with a dot in the name it serves the
asset under, which the download accounts for. The package keeps the name RPM
gave it once on disk, tilde included.

## Update the sls state

 - git add changes because codegen need to list them.
 - generate the sls state from the chart:
   ```./doit.sh codegen:chart_$CHART_NAME```
