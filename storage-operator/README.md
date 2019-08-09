# Storage Operator

## How to run the operator locally

1. Connect to the bootstrap node
2. Deploy the CRD from `storage-operator/deploy/crds` into your cluster using
   `kubectl apply`.
3. Copy the /etc/kubernetes/admin.conf from the bootstrap node to your local
   machine.
4. Get the "public" IP of the Salt API server (the one that use the port 4507):

    `kubectl --kubeconfig /etc/kubernetes/admin.conf -n kube-system describe svc salt-master | grep 'Endpoints'`

5. Start the operator on your machine

```shell
export KUBECONFIG=<path-to-the-admin.cong-you-copied-locally>
export METALK8S_SALT_MASTER_ADDRESS=http://<IP-OF-SALT-API-WITH-PORT>
cd storage-operator
operator-sdk up local
```
