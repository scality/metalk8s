# See ../common/README.md
#module "common" {
#  source = "../common"
#}

# Configure the openstack network
variable "openstack_network" {
  type = "map"

  default = {
    name = "tenantnetwork1"
  }
}

# Configure the base image to spawn each component. Only centos>7.4 supported
variable "openstack_image_name" {
  type    = "string"
  default = "CentOS-7-x86_64-GenericCloud-1711.qcow2"
}

# Configure default username to establish ssh connection
variable "ssh_user" {
  type    = "string"
  default = "centos"
}

variable "local_link_config_address_ip_v4" {
  type    = "string"
  default = "169.254.169.254"
}

resource "openstack_compute_keypair_v2" "local_ssh_key" {
  name       = "${var.ssh_key_name}"
  public_key = "${file(var.ssh_key_path)}"
  count      = "${var.ssh_key_deploy ? 1 : 0}"
}

data "openstack_compute_keypair_v2" "local_ssh_key" {
  name       = "${var.ssh_key_name}"
  depends_on = ["openstack_compute_keypair_v2.local_ssh_key"]
}

data "openstack_images_image_v2" "centos7" {
  name = "${var.openstack_image_name}"
}

data "openstack_compute_flavor_v2" "large" {
  # m1.xlarge
  vcpus = 8
  ram   = 16384
  disk  = 40
}

data "openstack_compute_flavor_v2" "medium" {
  vcpus = 4
  ram   = 8192
  disk  = 40
}

data "openstack_networking_network_v2" "network" {
  name = "tenantnetwork1"
}

data "openstack_networking_subnet_v2" "subnet" {
  network_id = "${data.openstack_networking_network_v2.network.id}"
}

resource "openstack_networking_secgroup_v2" "common" {
  name                 = "${var.name_prefix}-common"
  description          = "security group for all kube nodes"
  delete_default_rules = true
}

resource "openstack_networking_secgroup_rule_v2" "common_egress_ipv4" {
  direction         = "egress"
  ethertype         = "IPv4"
  security_group_id = "${openstack_networking_secgroup_v2.common.id}"
  count             = "${local.egress_blocked ? 0 : 1}"
}

resource "openstack_networking_secgroup_rule_v2" "common_egress_ipv6" {
  direction         = "egress"
  ethertype         = "IPv6"
  security_group_id = "${openstack_networking_secgroup_v2.common.id}"
  count             = "${local.egress_blocked ? 0 : 1}"
}

resource "openstack_networking_secgroup_rule_v2" "dns_egress_ipv4" {
  direction         = "egress"
  ethertype         = "IPv4"
  protocol          = "udp"
  port_range_min    = 53
  port_range_max    = 53
  remote_ip_prefix  = "${element(data.openstack_networking_subnet_v2.subnet.dns_nameservers, count.index)}/32"
  security_group_id = "${openstack_networking_secgroup_v2.common.id}"

  count = "${local.egress_blocked ?
        length(data.openstack_networking_subnet_v2.subnet.dns_nameservers) : 0
    }"
}

resource "openstack_networking_secgroup_rule_v2" "local_link_config_egress" {
  direction         = "egress"
  ethertype         = "IPv4"
  protocol          = "tcp"
  port_range_min    = 80
  port_range_max    = 80
  remote_ip_prefix  = "${var.local_link_config_address_ip_v4}/32"
  security_group_id = "${openstack_networking_secgroup_v2.common.id}"
  count             = "${local.egress_blocked ? 1 : 0}"
}

resource "openstack_networking_secgroup_rule_v2" "proxy_egress_ipv4" {
  direction         = "egress"
  ethertype         = "IPv4"
  protocol          = "tcp"
  port_range_min    = 3128
  port_range_max    = 3128
  remote_ip_prefix  = "${element(openstack_compute_instance_v2.proxies.*.access_ip_v4, count.index)}/32"
  security_group_id = "${openstack_networking_secgroup_v2.common.id}"
  count             = "${local.egress_blocked ? var.proxies_count : 0}"
}

resource "openstack_networking_secgroup_rule_v2" "common_ssh" {
  direction         = "ingress"
  ethertype         = "IPv4"
  protocol          = "tcp"
  port_range_min    = 22
  port_range_max    = 22
  remote_ip_prefix  = "0.0.0.0/0"
  security_group_id = "${openstack_networking_secgroup_v2.common.id}"
}
