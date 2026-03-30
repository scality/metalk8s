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
REPO_NAME=banzaicloud-stable
REPO_URL=https://kubernetes-charts.banzaicloud.com/
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

Target versions are pinned in `scripts/upgrade-operator-sdk/<name>/config.yaml`:

```yaml
operator_sdk_version: v1.42.1    # target operator-sdk release
go_toolchain: go1.25.8           # pin Go toolchain (for GOTOOLCHAIN)
k8s_libs: v0.33.9                # pin k8s.io libs version
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

The script processes one operator at a time. Run it once per operator:

```bash
python3 scripts/upgrade-operator-sdk/upgrade.py operator
python3 scripts/upgrade-operator-sdk/upgrade.py storage-operator
```

The argument is the name of the config directory next to the script
(i.e. `scripts/upgrade-operator-sdk/<name>/`). A full path can also be
given for configs stored elsewhere.

Options:

```
--skip-backup     Reuse an existing .bak directory (no new backup)
--clean-tools     Delete .tmp/bin/ after the upgrade
--yes, -y         Skip the confirmation prompt
```

### YAML config files

Each operator has a config directory at `scripts/upgrade-operator-sdk/<name>/` containing
`config.yaml` and a `patches/` subdirectory. The config fields are:

- **Versions**: `operator_sdk_version`, `go_toolchain` (optional pin), `k8s_libs` (optional pin)
- **Scaffold**: `repo`, `domain`, `apis` (with `group`, `version`, `kind`, `namespaced`). The operator name is derived from the config directory name.
- **Paths**: `operator_dir`, `backup_paths`
- **Post-processing**: `image_placeholder`, `extra_commands`

### Patch files

MetalK8s-specific customizations to scaffold-generated files (`Dockerfile`, `Makefile`)
are stored as GNU unified diff files in the `patches/` subdirectory next to `config.yaml`. The script
applies them with `patch -p1` after scaffolding. If a patch does not apply cleanly,
look for `.rej` files and resolve manually.

Patch files use `__PLACEHOLDER__` tokens for values from the YAML config:

| Placeholder       | Replaced with                   | Source     |
| ----------------- | ------------------------------- | ---------- |
| `__GOTOOLCHAIN__` | Detected/pinned Go toolchain    | `Makefile` |
| `__IMAGE__`       | `image_placeholder` from config | `Makefile` |

New `.patch` files in the patches directory are automatically picked up.

### What to review after the upgrade

1. `git diff` to review all changes
2. `cd <operator> && make test` to run tests
3. Check `config/crd/bases/` for correct CRD scopes
4. Check `config/rbac/role.yaml` for RBAC completeness
5. Check `deploy/manifests.yaml` for correct Jinja templates
6. Remove backup: `rm -rf <operator>.bak/`

## Calico

- Update images in `buildchain/buildchain/versions.py`.
- Update manifest in `salt/metalk8s/kubernetes/cni/calico/deployed.sls`:
  - copy the file from [here](https://github.com/projectcalico/calico/blob/$version/manifests/calico.yaml).
  - apply metalk8s patches as they will show up in the diffs. All Metalk8s necessary changes have appended comments.

## Containerd

The version just needs to be updated in `buildchain/buildchain/versions.py`.

## Update the sls state

 - git add changes because codegen need to list them.
 - generate the sls state from the chart:
   ```./doit.sh codegen:chart_$CHART_NAME```
