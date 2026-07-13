# metalk8s

This is a **Kubernetes distribution for long-term on-premises deployments** (Scality's opinionated Kubernetes). It contains:

- **Go Kubernetes operator** (`operator/`) using controller-runtime v0.18, targeting Kubernetes v0.30 — reconcilers, CRDs, RBAC
- **TypeScript/React UI** (`ui/`, `shell-ui/`) using rspack, react-router v7, react-query, `@scality/core-ui`, `@scality/module-federation` — biome for linting (not eslint)
- **Salt states** (`salt/`) for infrastructure and addon management (cert-manager, dex, prometheus-operator, nginx-ingress, etc.)
- **Python buildchain** (`buildchain/`) using doit, and BDD tests (`tests/`) using tox/pytest/behave
- **Helm charts** (`charts/`) and **Kustomize overlays** (`kustomizes/`) for Kubernetes deployments
- Scality internal deps: `@scality/core-ui`, `@scality/module-federation` (npm semver tags), `@kubernetes/client-node` (pinned to a git tag in package.json)

## Adding a Helm-chart-based salt addon

Full checklist -- easy-to-forget items in **bold**:

- Vendor the full chart under `charts/<name>/` and **document its source in `BUMPING.md`** (some upstreams are OCI-only, e.g. deliveryhero: `oci://ghcr.io/deliveryhero/helm-charts`)
- Values overrides in `charts/<name>.yaml` (`__image__(...)`/`__var__(...)` magic strings); render via a `codegen_chart_<name>` task in `buildchain/buildchain/codegen.py` -- never hand-edit the generated `chart.sls`
- Container images: `buildchain/buildchain/versions.py` (version + digest), `constants.py` (source repository), `image.py` (`IMGS_PER_REPOSITORY`)
- **List every new salt file in `buildchain/buildchain/salt_tree.py`**, otherwise it does not ship in the ISO
- Include the addon in `salt/metalk8s/deployed/init.sls`
- SLS rendered by orchestrate (master-side) need a `mode: master` case in `salt/tests/unit/formulas/config.yaml`
- **Add the addon's DaemonSet/Deployment to `tests/post/features/sanity.feature`**
- CHANGELOG entry under the in-development release

Salt gotcha: SLS applied via `state.orchestrate` render master-side, where `salt['mine.get']` returns `{}` -- use `salt.saltutil.runner('mine.get', ...)` instead (see `salt/metalk8s/orchestrate/register_etcd.sls`).
