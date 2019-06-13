#!/usr/bin/env bash

# On single node WORKLOAD_IP = eth0
WORKLOAD_IP=$(ip a show eth0 | grep -Po "inet \K[\d.]+")
UI_NODEPORT=$(sudo kubectl --kubeconfig=/etc/kubernetes/admin.conf get svc metalk8s-ui -n kube-system -o jsonpath='{.spec.ports[0].nodePort}')

npm install --no-save --quiet --no-package-lock cypress@3.2.0 cypress-cucumber-preprocessor@1.12.0

npm run test:e2e -- -e target_url="http://${WORKLOAD_IP}:${UI_NODEPORT}"
