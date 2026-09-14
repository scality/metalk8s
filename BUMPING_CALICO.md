# Bumping Calico

Calico does not use a Helm chart. The manifest is maintained directly as a
Jinja-templated Salt state with MetalK8s-specific patches applied on top of the
upstream manifest.

## 1. Update versions and digests in `buildchain/buildchain/versions.py`

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

## 2. Discover which patches need to be reapplied

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

## 3. Update the manifest

Copy the new upstream manifest as the new `deployed.sls`:

```sh
cp /tmp/calico-${NEW}.yaml salt/metalk8s/kubernetes/cni/calico/deployed.sls
```

Then re-apply all MetalK8s patches. The complete list of patches (all have
inline `# NOTE:` or `# Note:` comments in the file to mark them) is:

### Jinja file header (top of file, before the first `---`)

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

### ConfigMap `calico-config` — MTU (`veth_mtu` key)

```yaml
  # NOTE: We do not use the auto-detection mechanism as it's not acceptable in
  #       MetalK8s context
  #       see: https://github.com/projectcalico/felix/pull/2511#issuecomment-733121759
  # MTU for calico = workload MTU - 20 (for IPinIP header)
  veth_mtu: "{{ networks.workload_plane.mtu - 20 }}"
```

### ConfigMap `calico-config` — PortMap CNI plugin (`cni_network_config` key)

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

### DaemonSet `calico-node` — pod template annotations

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

### DaemonSet `calico-node` — `IP_AUTODETECTION_METHOD` env var

Insert after the `IP: autodetect` env var:

```yaml
            - name: IP_AUTODETECTION_METHOD
              # NOTE: Use all workload CIDRs
              value: cidr={{ networks.workload_plane.cidr | join(',') }}
```

### DaemonSet `calico-node` — IPIP mode

Change `CALICO_IPV4POOL_IPIP` from `"Always"` to `"CrossSubnet"` and add a
comment:

```yaml
            # Note: In MetalK8s we want to use IPIP encapsulation
            #       only for cross subnet communication.
            - name: CALICO_IPV4POOL_IPIP
              value: "CrossSubnet"
```

### DaemonSet `calico-node` — pod CIDR

Uncomment `CALICO_IPV4POOL_CIDR` and set it from the pillar:

```yaml
            - name: CALICO_IPV4POOL_CIDR
              value: "{{ networks.pod }}"
```

### DaemonSet `calico-node` — disable usage reporting

Insert after `FELIX_HEALTHENABLED`:

```yaml
            # Note: We do not want to report about outgoing connections
            #       in Metalk8s
            - name: FELIX_USAGEREPORTINGENABLED
              value: "false"
```

### Deployment `calico-kube-controllers` — node affinity and tolerations

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

### Image references (all containers)

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
