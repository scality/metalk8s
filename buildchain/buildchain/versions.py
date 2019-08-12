# coding: utf-8


"""Authoritative listing of image and package versions used in the project.

This module MUST be kept valid in a standalone context, since it is intended
for use in tests and documentation as well.
"""

from collections import namedtuple
from pathlib import Path
from typing import Tuple


Image = namedtuple('Image', ('name', 'version', 'digest'))
Package = namedtuple('Package', ('name', 'version', 'release'))

# Project-wide versions {{{

CALICO_VERSION     : str = '3.8.0'
K8S_VERSION        : str = '1.15.2'
KEEPALIVED_VERSION : str = '1.3.5-8.el7_6'
SALT_VERSION       : str = '2018.3.4'

def load_version_information() -> None:
    """Load version information from `VERSION`."""
    to_update = {
        'VERSION_MAJOR', 'VERSION_MINOR', 'VERSION_PATCH', 'VERSION_SUFFIX'
    }
    with VERSION_FILE.open('r', encoding='utf-8') as fp:
        for line in fp:
            name, _, value = line.strip().partition('=')
            # Don't overwrite random variables by trusting an external file.
            var = name.strip()
            if var in to_update:
                globals()[var] = value.strip()


VERSION_FILE = (Path(__file__)/'../../../VERSION').resolve()

# Metalk8s version.
# (Those declarations are not mandatory, but they help pylint and mypy).
VERSION_MAJOR  : str
VERSION_MINOR  : str
VERSION_PATCH  : str
VERSION_SUFFIX : str

load_version_information()

SHORT_VERSION : str = '{}.{}'.format(VERSION_MAJOR, VERSION_MINOR)
VERSION : str = '{}.{}{}'.format(SHORT_VERSION, VERSION_PATCH, VERSION_SUFFIX)


# }}}
# Container images {{{

CENTOS_BASE_IMAGE : str = 'docker.io/centos'
CENTOS_BASE_IMAGE_SHA256 : str = \
    '6ae4cddb2b37f889afd576a17a5286b311dcbf10a904409670827f6f9b50065e'

NGINX_IMAGE_VERSION  : str = '1.15.8'
NODEJS_IMAGE_VERSION : str = '10.16.0'

# Current build IDs, to be augmented whenever we rebuild the corresponding
# image, e.g. because the `Dockerfile` is changed, or one of the dependencies
# installed in the image needs to be updated.
# This should be reset to 1 when the service exposed by the container changes
# version.
SALT_MASTER_BUILD_ID = 1
KEEPALIVED_BUILD_ID  = 1


def _version_prefix(version: str, prefix: str = 'v') -> str:
    return "{}{}".format(prefix, version)


# Digests are quite a mouthful, so:
# pylint:disable=line-too-long
CONTAINER_IMAGES : Tuple[Image, ...] = (
    # Remote images
    Image(
        name='addon-resizer-amd64',
        version='2.1',
        digest='sha256:d00afd42fc267fa3275a541083cfe67d160f966c788174b44597434760e1e1eb',
    ),
    Image(
        name='alertmanager',
        version='v0.16.0',
        digest='sha256:ba7f0a57348774f46d4476b71a2033914c1f1437920b5188eec54b145a5b7433',
    ),
    Image(
        name='calico-node',
        version=_version_prefix(CALICO_VERSION),
        digest='sha256:6679ccc9f19dba3eb084db991c788dc9661ad3b5d5bafaa3379644229dca6b05',
    ),
    Image(
        name='calico-kube-controllers',
        version=_version_prefix(CALICO_VERSION),
        digest='sha256:cf461efd25ee74d1855e1ee26db98fe87de00293f7d039212adb03c91fececcd',
    ),
    Image(
        name='configmap-reload',
        version='v0.0.1',
        digest='sha256:e2fd60ff0ae4500a75b80ebaa30e0e7deba9ad107833e8ca53f0047c42c5a057',
    ),
    Image(
        name='coredns',
        version='1.3.1',
        digest='sha256:02382353821b12c21b062c59184e227e001079bb13ebd01f9d3270ba0fcbf1e4',
    ),
    Image(
        name='etcd',
        version='3.3.10',
        digest='sha256:17da501f5d2a675be46040422a27b7cc21b8a43895ac998b171db1c346f361f7',
    ),
    Image(
        name='grafana',
        version='6.0.0',
        digest='sha256:b5098a06dc59d28b11120eab01d8d0147b526a175aa606f9978934b6b2224138',
    ),
    Image(
        name='k8s-prometheus-adapter-amd64',
        version='v0.4.1',
        digest='sha256:cd44106e853564873e6bf261a672f0ee2122cdbd70800dafce2c3c26d0b4be95',
    ),
    Image(
        name='kube-apiserver',
        version=_version_prefix(K8S_VERSION),
        digest='sha256:8484f7128c5b3f0dddcf04bcc9edbfd6b570fde005d874a6240e23583beb3fcb',
    ),
    Image(
        name='kube-controller-manager',
        version=_version_prefix(K8S_VERSION),
        digest='sha256:835f32a5cdb30e86f35675dd91f9c7df01d48359ab8b51c1df866a2c7ea2e870',
    ),
    Image(
        name='kube-proxy',
        version=_version_prefix(K8S_VERSION),
        digest='sha256:4ef8ca8fa1fbe311f3e6c5d6123d19f48a7bc62984ea8acfc8da8fbdac52bff7',
    ),
    Image(
        name='kube-rbac-proxy',
        version='v0.4.1',
        digest='sha256:9d07c391aeb1a9d02eb4343c113ed01825227c70c32b3cae861711f90191b0fd',
    ),
    Image(
        name='kube-scheduler',
        version=_version_prefix(K8S_VERSION),
        digest='sha256:591f79411b67ff0daebfb2bb7ff15c68f3d6b318d73f228f89a2fcb2c657ebea',
    ),
    Image(
        name='kube-state-metrics',
        version='v1.5.0',
        digest='sha256:b7a3143bd1eb7130759c9259073b9f239d0eeda09f5210f1cd31f1a530599ea1',
    ),
    Image(
        name='nginx',
        version=NGINX_IMAGE_VERSION,
        digest='sha256:dd2d0ac3fff2f007d99e033b64854be0941e19a2ad51f174d9240dda20d9f534',
    ),
    Image(
        name='nginx-ingress-controller',
        version='0.25.0',
        digest='sha256:464db4880861bd9d1e74e67a4a9c975a6e74c1e9968776d8d4cc73492a56dfa5',
    ),
    Image(
        name='nginx-ingress-defaultbackend-amd64',
        version='1.5',
        digest='sha256:4dc5e07c8ca4e23bddb3153737d7b8c556e5fb2f29c4558b7cd6e6df99c512c7',
    ),
    Image(
        name='node-exporter',
        version='v0.17.0',
        digest='sha256:1b129a3801a0440f9c5b2afb20082dfdb31bf6092b561f5f249531130000cb83',
    ),
    Image(
        name='pause',
        version='3.1',
        digest='sha256:f78411e19d84a252e53bff71a4407a5686c46983a2c2eeed83929b888179acea',
    ),
    Image(
        name='prometheus',
        version='v2.5.0',
        digest='sha256:478d0b68432ea289a2e8455cbc30ee38b7ade6d13b4f73877203184c64914d9b',
    ),
    Image(
        name='prometheus-config-reloader',
        version='v0.28.0',
        digest='sha256:5ea13d504f08ddd4d6568830e1ae104347532f316d62b1f3d338bd37e703cfba',
    ),
    Image(
        name='prometheus-operator',
        version='v0.28.0',
        digest='sha256:db8575085bba268f79bba7f6f934b552dfe8de8e32048a554702b55d7b3f8888',
    ),
    # Local images
    Image(
        name='keepalived',
        version='{version}-{build_id}'.format(
            version=KEEPALIVED_VERSION, build_id=KEEPALIVED_BUILD_ID
        ),
        digest=None,
    ),
    Image(
        name='metalk8s-ui',
        version=VERSION,
        digest=None,
    ),
    Image(
        name='metalk8s-utils',
        version=VERSION,
        digest=None,
    ),
    Image(
        name='salt-master',
        version='{version}-{build_id}'.format(
            version=SALT_VERSION, build_id=SALT_MASTER_BUILD_ID
        ),
        digest=None,
    ),
    Image(
        name='storage-operator',
        version='latest',
        digest=None,
    ),
)

CONTAINER_IMAGES_MAP = {image.name: image for image in CONTAINER_IMAGES}

# }}}
# Packages {{{

PACKAGES = (
    # Remote packages
    Package(
        name='containerd',
        version='1.2.4',
        release='1.el7',
    ),
    Package(
        name='cri-tools',
        version='1.13.0',
        release='0',
    ),
    Package(
        name='container-selinux',
        version='2.99',
        release='1.el7_6',
    ),
    Package(
        name='coreutils',
        version='8.22',
        release='23.el7',
    ),
    Package(
        name='ebtables',
        version='2.0.10',
        release='16.el7',
    ),
    Package(
        name='ethtool',
        version='4.8',
        release='9.el7',
    ),
    Package(
        name='e2fsprogs',
        version='1.42.9',
        release='13.el7',
    ),
    Package(
        name='genisoimage',
        version='1.1.11',
        release='25.el7',
    ),
    Package(
        name='iproute',
        version='4.11.0',
        release='14.el7_6.2',
    ),
    Package(
        name='iptables',
        version='1.4.21',
        release='28.el7',
    ),
    Package(
        name='kubectl',
        version=K8S_VERSION,
        release='0',
    ),
    Package(
        name='kubelet',
        version=K8S_VERSION,
        release='0',
    ),
    Package(
        name='kubernetes-cni',
        version='0.7.5',
        release='0',
    ),
    Package(
        name='m2crypto',
        version='0.31.0',
        release='3.el7',
    ),
    Package(
        name='python2-kubernetes',
        version='8.0.1',
        release='1.el7',
    ),
    Package(
        name='runc',
        version='1.0.0',
        release='59.dev.git2abd837.el7.centos',
    ),
    Package(
        name='salt-minion',
        version=SALT_VERSION,
        release='1.el7',
    ),
    Package(
        name='skopeo',
        version='0.1.35',
        release='2.git404c5bd.el7.centos',
    ),
    Package(
        name='socat',
        version='1.7.3.2',
        release='2.el7',
    ),
    Package(
        name='sos',
        version='3.6',
        release='17.el7.centos',
    ),
    Package(
        name='util-linux',
        version='2.23.2',
        release='59.el7_6.1',
    ),
    Package(
        name='xfsprogs',
        version='4.5.0',
        release='18.el7',
    ),
    Package(
        name='yum-plugin-versionlock',
        version='1.1.31',
        release='50.el7',
    ),
    # Local packages
    Package(
        name='metalk8s-sosreport',
        version=SHORT_VERSION,
        release='1.el7',
    ),
    Package(
        name='calico-cni-plugin',
        version=CALICO_VERSION,
        release='1.el7',
    ),
)

PACKAGES_MAP = {pkg.name: pkg for pkg in PACKAGES}

# }}}
