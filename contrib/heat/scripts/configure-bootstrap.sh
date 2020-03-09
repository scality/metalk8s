#!/bin/bash -x

declare -r private_key="$1"
declare -r public_key="$2"

echo "Pre-seeding Salt minion ID"
mkdir -p /etc/salt
echo "bootstrap" > /etc/salt/minion_id

echo "Writing Salt master SSH identity"
mkdir -p /etc/metalk8s/pki
echo "$private_key" > /etc/metalk8s/pki/salt-bootstrap
echo "$public_key" > /etc/metalk8s/pki/salt-bootstrap.pub
chmod 600 /etc/metalk8s/pki/salt-bootstrap*


source /run/metalk8s/scripts/activate-proxy &> /dev/null

echo "Writing BootstrapConfiguration file"
cat > /etc/metalk8s/bootstrap.yaml << EOF
apiVersion: metalk8s.scality.com/v1alpha2
kind: BootstrapConfiguration
networks:
    controlPlane: 192.168.1.0/24
    workloadPlane: 192.168.2.0/24
ca:
    minion: bootstrap
proxies:
    http: $http_proxy
    https: $https_proxy
archives:
    - /archives/metalk8s/metalk8s.iso
EOF

deactivate-proxy &> /dev/null

cat /etc/metalk8s/bootstrap.yaml
