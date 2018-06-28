###

## Update

Till kube-prometheus supports disabling node_exporter daemonset, you have to maintain in sync the file
`templates/node_exporter.yaml.j2` with <https://github.com/scality/prometheus-operator/tree/external-node-exporter>

To do so:
```
$ git clone https://github.com/scality/prometheus-operator -b external-node-exporter
$ cd prometheus-operator/helm/
$ helm template exporter-node --set enableDaemonSet=False --namespace kube-ops --name-template kube-prometheus > node_exporter.yaml
```

Edit the `node_exporter.yaml` as followed:

* remove all labels `heritage: Tiller`
* change release to  `exporter-node`
* change apiversion of ServiceMonitor from `monitoring.coreos.com/v1alpha1` to `monitoring.coreos.com/v1`
