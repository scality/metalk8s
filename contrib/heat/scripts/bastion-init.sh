#!/bin/bash

echo "Started" `date` | tee -a /root/install.log

echo "Checking for Happy Resolver..."
while ping -c 2 repo.saltstack.com 2>&1 | grep -q "unknown host"
do
  echo "Waiting for network resolution..."
done
echo "Network resolution available. Continuing."

# Retrieve and install Terraform
TF_VERSION="0.12.20"

echo "Downloading Terraform $TF_VERSION..."

TF_URL="https://releases.hashicorp.com/terraform/${TF_VERSION}"
TF_ARCHIVE="terraform_${TF_VERSION}_linux_amd64.zip"

curl --retry 5 -O "$TF_URL/$TF_ARCHIVE"
sudo unzip "$TF_ARCHIVE" -d /usr/local/sbin/
rm -f "$TF_ARCHIVE"

echo "Terraform installed."

# Clone MetalK8s repository to get Terraform module definition
echo "Retrieving MetalK8s sources for Terraform definitions..."

git clone \
  --branch feature/add-heat-templates \
  --single-branch \
  https://github.com/scality/metalk8s \
  ./metalk8s-terraform

cp -R ./metalk8s-terraform/contrib/terraform/* /run/terraform/

echo "Terraform definitions ready."

# Initialize Terraform
echo "Initializing Terraform..."

cd /run/terraform
terraform init

echo "Terraform initialized."

# Apply Terraform configuration with provided /run/terraform/deployment.tfvars
echo "Spawning cluster using Terraform..."

source openstack.env  # The OpenStack API credentials, provisioned by Heat

# Import self as Bastion instance into Terraform state
terraform import \
  openstack_compute_instance_v2.bastion $(cat /run/cloud-init/.instance-id)

terraform apply \
  -var-file scality-cloud.tfvars \
  -var-file deployment.tfvars \
  -auto-approve

echo "Spawn complete!"

# TODO: Write script output values
# (this needs `heat-config-script` in the base image)
