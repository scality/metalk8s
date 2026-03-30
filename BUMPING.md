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
- A GitHub personal access token is optional but strongly recommended: without it,
  GitHub API calls are subject to a 60 requests/hour anonymous rate limit. The token
  must be **exported** so child processes inherit it:

  ```
  export GITHUB_TOKEN=<your_token>
  ```

  Setting the variable without `export` (e.g. `GITHUB_TOKEN=xxx`) is silently
  ignored by the script because Python's `os.environ` only sees exported variables.

### Running the upgrade

```
python3 scripts/upgrade-operator-sdk.py
```

The script will display the resolved versions and prompt for confirmation before
making any changes. Use `--yes` to skip the confirmation (e.g. in CI). The original
operator directories are preserved as `<name>.bak/` for the duration of the review.

Options:

```
--operator-only   Only process operator/
--storage-only    Only process storage-operator/
--skip-backup     Reuse an existing .bak directory (no new backup)
--clean-tools     Delete .tmp/bin/ after the upgrade (~150 MB, re-downloaded next run)
--yes, -y         Skip the confirmation prompt
```

The script caches `operator-sdk` in `.tmp/bin/` so it is not re-downloaded on
repeated runs. Use `--clean-tools` to reclaim disk space once the upgrade is
validated.

### What to review after the upgrade

After a successful run:

1. Compare the backup against the result to spot unexpected differences:

   ```
   diff -r operator.bak/ operator/
   diff -r storage-operator.bak/ storage-operator/
   ```

2. Run the unit test suite for each operator:

   ```
   cd operator && make test
   cd storage-operator && make test
   ```

3. Check that generated CRD scopes are correct:
   `config/crd/bases/` — `ClusterConfig` must be `Cluster`-scoped,
   `VirtualIPPool` must be `Namespaced`, `Volume` must be `Cluster`-scoped.

4. Check that the generated RBAC is complete:
   `config/rbac/role.yaml` in each operator.

5. Check that the MetalK8s manifests contain the correct Jinja template:
   `deploy/manifests.yaml` must contain
   `{{ build_image_name("metalk8s-operator") }}` / `{{ build_image_name("storage-operator") }}`.

6. Remove the backup directories once satisfied:

   ```
   rm -rf operator.bak/ storage-operator.bak/
   ```

### Patch files

MetalK8s-specific customizations to scaffold-generated files (`Dockerfile`, `Makefile`)
are stored as standard GNU unified diff files in `scripts/patches/<operator>/`:

```
scripts/patches/
  operator/
    Dockerfile.patch    # extra COPY dirs, ldflags, Scality LABEL block
    Makefile.patch      # GOTOOLCHAIN export, metalk8s make target
  storage-operator/
    Dockerfile.patch    # extra COPY salt/, Scality LABEL block
    Makefile.patch      # GOTOOLCHAIN export, metalk8s make target
```

The script applies them with `patch -p1` after scaffolding. If a patch does not
apply cleanly (e.g. because the scaffold changed significantly), the script warns
but continues — look for `.rej` files in the operator directory and resolve manually.

#### Placeholders

Patch files use `__PLACEHOLDER__` tokens for values that are only known at runtime.
The script replaces them after applying the patches:

| Placeholder | Replaced with | File |
|---|---|---|
| `__GOTOOLCHAIN__` | Detected Go toolchain (e.g. `go1.25.8`) | `Makefile` |
| `__IMAGE__` | Jinja2 `build_image_name(...)` expression | `Makefile` |

The `FROM golang:X.Y` line in `Dockerfile` and `GOLANGCI_LINT_VERSION` in `Makefile`
are updated by simple regex substitutions (not via patches), since their values change
with every upgrade.

#### How to add or update a patch

Patches are plain `diff -u` output — you can edit them by hand or regenerate them.
To regenerate after modifying an operator customization:

```bash
# 1. Run the upgrade script with --skip-backup to get a fresh scaffold
python3 scripts/upgrade-operator-sdk.py --operator-only --skip-backup --yes

# 2. The script applies existing patches; to start fresh, reset the file:
git checkout operator/Dockerfile

# 3. Make your changes to the scaffold file
vim operator/Dockerfile

# 4. Generate the new patch (a/ b/ prefixes are required for patch -p1)
diff -u <(git show HEAD:operator/Dockerfile) operator/Dockerfile \
  | sed '1s|.*|--- a/Dockerfile|;2s|.*|+++ b/Dockerfile|' \
  > scripts/patches/operator/Dockerfile.patch

# 5. Verify it applies cleanly
git checkout operator/Dockerfile
patch -p1 --dry-run -d operator < scripts/patches/operator/Dockerfile.patch
```

To add a patch for a new file (e.g. `README.md`), create a new `.patch` file in
the same directory — the script automatically picks up all `*.patch` files.

### Stale compatibility fixes

The `OPERATORS` dict in `scripts/upgrade-operator-sdk.py` contains a `fixes` tuple
per operator. These entries are one-shot source-level corrections applied after the
backup merge (e.g. deprecated API replacements). Once the backup no longer contains
the old pattern — i.e. after the script has been run at least once — the entry
becomes a no-op and should be removed to keep the script clean.

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
