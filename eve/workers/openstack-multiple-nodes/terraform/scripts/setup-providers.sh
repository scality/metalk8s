# Install development preview of Terraform providers for v0.12
download_provider() {
    local -r provider=$1 version=$2
    echo "downloading provider $provider version $version"
    curl -O "http://terraform-0.12.0-dev-snapshots.s3-website-us-west-2.amazonaws.com/terraform-provider-${provider}/${version}/terraform-provider-${provider}_${version}_linux_amd64.zip"
    unzip "terraform-provider-${provider}_${version}_linux_amd64.zip" -d /home/eve/.terraform.d/plugins/
    rm -f "terraform-provider-${provider}_${version}_linux_amd64.zip"
}

TERRAFORM_DIR=$(pwd)
mkdir -p /home/eve/.terraform.d/plugins

download_provider null 2.2.0-dev20190415H16-dev
download_provider random 3.0.0-dev20190216H01-dev
download_provider template 2.2.0-dev20190415H16-dev

# Development preview of OpenStack provider is too old, we need to build it
# from the Git repository

# Install Go first
curl -O https://dl.google.com/go/go1.12.5.linux-amd64.tar.gz
tar -xzf go1.12.5.linux-amd64.tar.gz
sudo mv go /usr/local
export GOROOT=/usr/local/go
export GOPATH=/home/eve/go
export PATH=$PATH:$GOROOT/bin

# Then build from source
mkdir -p /home/eve/go/src/github.com/terraform-providers/
cd /home/eve/go/src/github.com/terraform-providers/
git clone https://github.com/terraform-providers/terraform-provider-openstack
cd terraform-provider-openstack
git checkout -b build-v0.12
make build

# Copy the built binary to plugins directory
cd $TERRAFORM_DIR
mv $GOPATH/bin/terraform-provider-openstack /home/eve/.terraform.d/plugins/
