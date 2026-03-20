# metalk8s

This is a **Kubernetes distribution for long-term on-premises deployments** (Scality's opinionated Kubernetes). It contains:

- **Go Kubernetes operator** (`operator/`) using controller-runtime v0.18, targeting Kubernetes v0.30 — reconcilers, CRDs, RBAC
- **TypeScript/React UI** (`ui/`, `shell-ui/`) using rspack, react-router v7, react-query, `@scality/core-ui`, `@scality/module-federation` — biome for linting (not eslint)
- **Salt states** (`salt/`) for infrastructure and addon management (cert-manager, dex, prometheus-operator, nginx-ingress, etc.)
- **Python buildchain** (`buildchain/`) using doit, and BDD tests (`tests/`) using tox/pytest/behave
- **Helm charts** (`charts/`) and **Kustomize overlays** (`kustomizes/`) for Kubernetes deployments
- Scality internal deps: `@scality/core-ui`, `@scality/module-federation` (npm semver tags), `@kubernetes/client-node` (pinned to a git tag in package.json)
