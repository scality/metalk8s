#!/bin/bash -x

export KUBECONFIG=/etc/kubernetes/admin.conf

# First, configure number of replicas for Monitoring services
# TODO: adapt to recent changes with "service configurations"

echo "Configuring monitoring services"
kubectl patch -n metalk8s-monitoring \
  prometheus prometheus-operator-prometheus \
  --type json \
  -p '[{"op": "replace", "path": "/spec/replicas", "value": 2}]'
kubectl patch -n metalk8s-monitoring \
  alertmanager prometheus-operator-alertmanager \
  --type json \
  -p '[{"op": "replace", "path": "/spec/replicas", "value": 2}]'

# Then, provision sparse-file Volumes on each infra Node
echo "Creating Volumes for monitoring services:"
for idx in {1..2}; do
  cat >> /run/metalk8s/manifests/infra_volumes.yaml << EOF
---
apiVersion: storage.metalk8s.scality.com/v1alpha1
kind: Volume
metadata:
  name: infra-${idx}-prometheus
spec:
  nodeName: infra-${idx}
  storageClassName: metalk8s-prometheus
  sparseLoopDevice:
    size: 20Gi
  template:
    metadata:
      labels:
        app.kubernetes.io/name: 'prometheus-operator-prometheus'
---
apiVersion: storage.metalk8s.scality.com/v1alpha1
kind: Volume
metadata:
  name: infra-${idx}-alertmanager
spec:
  nodeName: infra-${idx}
  storageClassName: metalk8s-prometheus
  sparseLoopDevice:
    size: 2Gi
  template:
    metadata:
      labels:
        app.kubernetes.io/name: 'prometheus-operator-alertmanager'
EOF
done
cat /run/metalk8s/manifests/infra_volumes.yaml
kubectl apply -f /run/metalk8s/manifests/infra_volumes.yaml

echo "Wait for all monitoring services to stabilize:"
/run/metalk8s/scripts/wait_pods_status.sh \
  --sleep-time 5 \
  --stabilization-time 30 \
  --retry 60 \
  --status "Running" \
  --namespace metalk8s-monitoring
