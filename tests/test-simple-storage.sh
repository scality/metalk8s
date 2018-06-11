#!/usr/bin/env bash

set -euo pipefail

echo "Listing all pv before test (some should be available):"
kubectl get pv
echo "Run simple pod accessing: storage"
kubectl apply -f storage/test_pv.yml
until kubectl get pods test-pv -o jsonpath={.status.phase} | grep -E '(Failed|Succeeded)'; do
  echo "Wait for pod to exit"
  sleep 1
done
RESULT=$(kubectl get pods test-pv -o jsonpath={.status.phase})
echo "Pod exited; listing all pv"
kubectl get pv
echo "Cleanup..."
kubectl delete pod test-pv
kubectl delete pvc testclaim
echo test is ${RESULT}
exit $([ "${RESULT}" = "Succeeded" ])
