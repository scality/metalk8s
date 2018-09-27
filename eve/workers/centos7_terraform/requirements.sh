TERRAFORM_VERSION=0.11.8

yum install -y epel-release unzip
yum install -y python2-pip python2-devel python36 python36-devel haveged
pip2 install tox

curl -O https://releases.hashicorp.com/terraform/${TERRAFORM_VERSION}/terraform_${TERRAFORM_VERSION}_linux_amd64.zip
unzip terraform_${TERRAFORM_VERSION}_linux_amd64.zip -d /usr/local/sbin/

systemctl start haveged
sudo -u eve ssh-keygen -t rsa -b 2048 -N '' -f /home/eve/.ssh/id_rsa
