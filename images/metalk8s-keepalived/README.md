# Keepalived container image

This a custom container image used in MetalK8s to manage
Virtual IPs spread on the nodes to expose the Workload Plane Ingress.

This image is composed of several scripts.

## Entrypoint script

This script is the entrypoint for the container, it generate the
configuration and start keepalived process.

## Generate config script

This script is used at container startup to generate the keepalived
configuration from a more high level configuration.

The input data should look like the following example:

```yaml
apiVersion: metalk8s.scality.com/v1alpha1
kind: KeepalivedConfiguration
addresses:
  - ip: 192.168.1.200   # Virtual IP address
    node: node-1        # Master node name for this IP
    vr_id: 10           # Virtual router ID
  - ip: 192.168.1.201
    node: node-2
    vr_id: 15
  - ip: 192.168.1.202
    node: node-3
    vr_id: 45
  - ip: 192.168.1.203
    vr_id: 12
```

## Check script

The check script is used by keepalived to check that the local node, where
the keepalived process is running, is ready to get some load.

It check that the local Ingress Controller is available

## Dockerfile

We need to build keepalived ourself to enable JSON, so that we can
use the JSON signal to get the current keepalived status in JSON format.

The keepalived binary from the package is not build with JSON enabled.
