#!/bin/bash -x

echo "Mounting MetalK8s ISO:"
source /archives/metalk8s/product.txt
mkdir -p /srv/scality/metalk8s-$VERSION
mount -o loop /archives/metalk8s/metalk8s.iso /srv/scality/metalk8s-$VERSION
echo "  -  mounted at /srv/scality/metalk8s-$VERSION"

echo "Starting Bootstrap installation:"
/srv/scality/metalk8s-$VERSION/bootstrap.sh --verbose

echo "Setting new Bootstrap roles and taints:"
export KUBECONFIG=/etc/kubernetes/admin.conf

kubectl label node bootstrap node-role.kubernetes.io/infra-
kubectl taint node bootstrap node-role.kubernetes.io/infra-

echo "Deleting Pods that should be rescheduled later:"

for ns in metalk8s-ui metalk8s-monitoring metalk8s-ingress; do
    kubectl delete pods -n $ns --field-selector spec.nodeName=bootstrap
done
