openstack_images = {
  centos7 = {
    image = "CentOS-7-x86_64-GenericCloud-1809.qcow2",
    user  = "centos",
  },
  rhel7 = {
    image = "rhel-server-updated-7.6-x86_64-kvm.qcow2",
    user  = "cloud-user",
  },
}

openstack_flavors = {
  small  = "m1.small",
  medium = "m1.medium",
  large  = "m1.large",
  xlarge = "m1.xlarge",
}
