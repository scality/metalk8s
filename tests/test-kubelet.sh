#!/bin/bash

set -xue -o pipefail

test -x /etc/kubernetes/manifests
test ! -f /etc/kubernetes/manifests/kubelet-test.yaml

cat > /etc/kubernetes/manifests/kubelet-test.yaml << EOF
apiVersion: v1
kind: Pod
metadata:
  name: kubelet-test-$(date +%d%m%y%H%M%S)
spec:
  hostNetwork: true
  containers:
    - name: web
      image: nginx
      ports:
        - name: web
          containerPort: 80
          protocol: TCP
EOF

success=0
for _ in $(seq 1 30); do
    set +e
    curl http://127.0.0.1
    rc=$?
    set -e
    if test ${rc} -eq 0; then
        echo 'nginx running'
        success=1
        break
    else
        echo 'nginx not yet running'
        sleep 1
    fi
done

test ${success} -eq 1

rm /etc/kubernetes/manifests/kubelet-test.yaml

success=0
for _ in $(seq 1 30); do
    set +e
    curl http://127.0.0.1
    rc=$?
    set -e
    if test ${rc} -ne 0; then
        echo 'nginx no longer running'
        success=1
        break
    else
        echo 'nginx still running'
        sleep 1
    fi
done

test ${success} -eq 1
