# coding: utf-8


"""Authoritative listing of image and package versions used in the project.

This module MUST be kept valid in a standalone context, since it is intended
for use in tests and documentation as well.
"""
import operator

from collections import namedtuple
from pathlib import Path
from typing import Any, cast, Dict, Optional, Tuple


Image = namedtuple("Image", ("name", "version", "digest"))

# Project-wide versions {{{

CALICO_VERSION: str = "3.17.0"
K8S_VERSION: str = "1.19.7"
SALT_VERSION: str = "3002.2"
CONTAINERD_VERSION: str = "1.4.3"

CALICO_RELEASE: str = "1"
CONTAINERD_RELEASE: str = "1"
SOSREPORT_RELEASE: str = "2"


def load_version_information() -> None:
    """Load version information from `VERSION`."""
    to_update = {"VERSION_MAJOR", "VERSION_MINOR", "VERSION_PATCH", "VERSION_SUFFIX"}
    with VERSION_FILE.open("r", encoding="utf-8") as fp:
        for line in fp:
            name, _, value = line.strip().partition("=")
            # Don't overwrite random variables by trusting an external file.
            var = name.strip()
            if var in to_update:
                globals()[var] = value.strip()


VERSION_FILE = (Path(__file__) / "../../../VERSION").resolve()

# Metalk8s version.
# (Those declarations are not mandatory, but they help pylint and mypy).
VERSION_MAJOR: str
VERSION_MINOR: str
VERSION_PATCH: str
VERSION_SUFFIX: str

load_version_information()

SHORT_VERSION: str = "{}.{}".format(VERSION_MAJOR, VERSION_MINOR)
VERSION: str = "{}.{}{}".format(SHORT_VERSION, VERSION_PATCH, VERSION_SUFFIX)


# }}}
# Container images {{{

CENTOS_BASE_IMAGE: str = "docker.io/centos"
CENTOS_BASE_IMAGE_SHA256: str = (
    "6ae4cddb2b37f889afd576a17a5286b311dcbf10a904409670827f6f9b50065e"
)

NGINX_IMAGE_VERSION: str = "1.19.6-alpine"
NODEJS_IMAGE_VERSION: str = "10.16.0"

# Current build IDs, to be augmented whenever we rebuild the corresponding
# image, e.g. because the `Dockerfile` is changed, or one of the dependencies
# installed in the image needs to be updated.
# This should be reset to 1 when the service exposed by the container changes
# version.
SALT_MASTER_BUILD_ID = 1


def _version_prefix(version: str, prefix: str = "v") -> str:
    return "{}{}".format(prefix, version)


# Digests are quite a mouthful, so:
# pylint:disable=line-too-long
CONTAINER_IMAGES: Tuple[Image, ...] = (
    # Remote images
    Image(
        name="alertmanager",
        version="v0.21.0",
        digest="sha256:24a5204b418e8fa0214cfb628486749003b039c279c56b5bddb5b10cd100d926",
    ),
    Image(
        name="calico-node",
        version=_version_prefix(CALICO_VERSION),
        digest="sha256:92227666988edccd1222d463173489fd656c5a37b8dedab0dadfbc22a471893a",
    ),
    Image(
        name="calico-kube-controllers",
        version=_version_prefix(CALICO_VERSION),
        digest="sha256:78a6e7648e22b2c87fcc06db610d753e49c6f9b3cf622ab23fdc3a63c1563fc8",
    ),
    Image(
        name="configmap-reload",
        version="v0.4.0",
        digest="sha256:17d34fd73f9e8a78ba7da269d96822ce8972391c2838e08d92a990136adb8e4a",
    ),
    Image(
        name="coredns",
        version="1.7.0",
        digest="sha256:73ca82b4ce829766d4f1f10947c3a338888f876fbed0540dc849c89ff256e90c",
    ),
    Image(
        name="dex",
        version="v2.27.0",
        digest="sha256:ff94efdd1ec68f43e01b39a2d11a73961b1cf73860515893118af731551f1939",
    ),
    Image(
        name="etcd",
        version="3.4.13-0",
        digest="sha256:4ad90a11b55313b182afc186b9876c8e891531b8db4c9bf1541953021618d0e2",
    ),
    Image(
        name="grafana",
        version="7.3.5",
        digest="sha256:511bc20bfcd1b79f3947bb1c33d152f7484e7a91418883fb4dddf71274227321",
    ),
    Image(
        name="k8s-sidecar",
        version="1.1.0",
        digest="sha256:3e86186656d346b440519bf1f41c2784d10fc63f907eac7e4f2a4bda1a7331f0",
    ),
    Image(
        name="kube-apiserver",
        version=_version_prefix(K8S_VERSION),
        digest="sha256:b964f0fa81209c3290aa74573009313701403521eafcdccb3b332adaf4f22f7e",
    ),
    Image(
        name="kube-controller-manager",
        version=_version_prefix(K8S_VERSION),
        digest="sha256:6a11b3700ad7af2f5772451689c68fa963118fba8c106b46f539bd0b44daba30",
    ),
    Image(
        name="kube-proxy",
        version=_version_prefix(K8S_VERSION),
        digest="sha256:d1217333dd1f1c76da0a9dbe85aef481c0fde0643a900c3f7113caf3fe4db1d7",
    ),
    Image(
        name="kube-scheduler",
        version=_version_prefix(K8S_VERSION),
        digest="sha256:0104e0a2954fdc467424a450a0362531b2081f809586446e4b2e63efb376a89a",
    ),
    Image(
        name="kube-state-metrics",
        version="v1.9.7",
        digest="sha256:2f82f0da199c60a7699c43c63a295c44e673242de0b7ee1b17c2d5a23bec34cb",
    ),
    Image(
        name="nginx",
        version=NGINX_IMAGE_VERSION,
        digest="sha256:629df02b47c8733258baf6663e308a86cd23f80247d35407022c35fd91a50ea3",
    ),
    Image(
        name="nginx-ingress-controller",
        version="v0.41.2",
        digest="sha256:1f4f402b9c14f3ae92b11ada1dfe9893a88f0faeb0b2f4b903e2c67a0c3bf0de",
    ),
    Image(
        name="nginx-ingress-defaultbackend-amd64",
        version="1.5",
        digest="sha256:4dc5e07c8ca4e23bddb3153737d7b8c556e5fb2f29c4558b7cd6e6df99c512c7",
    ),
    Image(
        name="node-exporter",
        version="v1.0.1",
        digest="sha256:cf66a6bbd573fd819ea09c72e21b528e9252d58d01ae13564a29749de1e48e0f",
    ),
    Image(
        name="pause",
        version="3.2",
        digest="sha256:80d28bedfe5dec59da9ebf8e6260224ac9008ab5c11dbbe16ee3ba3e4439ac2c",
    ),
    Image(
        name="prometheus",
        version="v2.22.1",
        digest="sha256:b899dbd1b9017b9a379f76ce5b40eead01a62762c4f2057eacef945c3c22d210",
    ),
    Image(
        name="k8s-prometheus-adapter-amd64",
        version="v0.8.2",
        digest="sha256:afbf7f6166855623ed6e9943b15659d140ce4b57ede7ea1f6ce045f2bf407a0f",
    ),
    Image(
        name="prometheus-config-reloader",
        version="v0.43.2",
        digest="sha256:cd6e5084f2d2c2290f4ace1a74d100a41050bbe797274eda3784db19191f63be",
    ),
    Image(
        name="prometheus-operator",
        version="v0.43.2",
        digest="sha256:240b10b07e15e95c3009da938e3abb8bef2fa47ea1f719ae58f7dd116bcb2f10",
    ),
    # Local images
    Image(
        name="metalk8s-ui",
        version=VERSION,
        digest=None,
    ),
    Image(
        name="shell-ui",
        version=VERSION,
        digest=None,
    ),
    Image(
        name="metalk8s-utils",
        version=VERSION,
        digest=None,
    ),
    Image(
        name="salt-master",
        version="{version}-{build_id}".format(
            version=SALT_VERSION, build_id=SALT_MASTER_BUILD_ID
        ),
        digest=None,
    ),
    Image(
        name="storage-operator",
        version="latest",
        digest=None,
    ),
    Image(
        name="loki",
        version="2.0.0",
        digest="sha256:77e138f81a8e253f1d0ea5d2dc329a02212ecab3247c87f85f1f2182a0160ccd",
    ),
    Image(
        name="fluent-bit-plugin-loki",
        version="1.6.0-amd64",
        digest="sha256:cb1cd95d0fcf76b626623684f0c8b204a9f773443650c7b3d243b96c29ff7020",
    ),
)

CONTAINER_IMAGES_MAP = {image.name: image for image in CONTAINER_IMAGES}

# }}}

# Packages {{{


class PackageVersion:
    """A package's authoritative version data.

    This class contains version information for a named package, and
    provides helper methods for formatting version/release data as well
    as version-enriched package name, for all supported OS families.
    """

    def __init__(
        self,
        name: str,
        version: Optional[str] = None,
        release: Optional[str] = None,
        override: Optional[str] = None,
    ):
        """Initializes a package version.

        Arguments:
            name: the name of the package
            version: the version of the package
            release: the release of the package
        """
        self._name = name
        self._version = version
        self._release = release
        self._override = override

    name = property(operator.attrgetter("_name"))
    version = property(operator.attrgetter("_version"))
    release = property(operator.attrgetter("_release"))
    override = property(operator.attrgetter("_override"))

    @property
    def full_version(self) -> Optional[str]:
        """The full package version string."""
        full_version = None
        if self.version:
            full_version = self.version
            if self.release:
                full_version = "{}-{}".format(self.version, self.release)
        return full_version

    @property
    def rpm_full_name(self) -> str:
        """The package's full name in RPM conventions."""
        if self.full_version:
            return "{}-{}".format(self.name, self.full_version)
        return cast(str, self.name)

    @property
    def deb_full_name(self) -> str:
        """The package's full name in DEB conventions."""
        if self.full_version:
            return "{}={}".format(self.name, self.full_version)
        return cast(str, self.name)


# The authoritative list of packages required.
#
# Common packages are packages for which we need not care about OS-specific
# divergences.
#
# In this case, either:
#   * the _latest_ version is good enough, and will be the one
#     selected by the package managers (so far: apt and yum).
#   * we have strict version requirements that span OS families, and the
#     version schemes _and_ package names do not diverge
#
# Strict version requirements are notably:
#   * kubelet and kubectl which _make_ the K8s version of the cluster
#   * salt-minion which _makes_ the Salt version of the cluster
#
# These common packages may be overridden by OS-specific packages if package
# names or version conventions diverge.
#
# Packages that we build ourselves require a version and release as part of
# their build process.

PACKAGES: Dict[str, Any] = {
    "common": (
        # Pinned packages
        PackageVersion(name="kubectl", version=K8S_VERSION),
        PackageVersion(name="kubelet", version=K8S_VERSION),
        # Latest packages
        PackageVersion(name="coreutils"),
        PackageVersion(name="cri-tools"),
        PackageVersion(name="e2fsprogs"),
        PackageVersion(name="ebtables"),
        PackageVersion(name="ethtool"),
        PackageVersion(name="genisoimage"),
        PackageVersion(name="iproute"),
        PackageVersion(name="iptables"),
        PackageVersion(name="kubernetes-cni"),
        PackageVersion(name="m2crypto"),
        PackageVersion(name="python36-pyOpenSSL"),
        PackageVersion(name="runc"),
        PackageVersion(name="salt-minion", version=SALT_VERSION),
        PackageVersion(name="socat"),
        PackageVersion(name="sos"),  # TODO download built package dependencies
        PackageVersion(name="util-linux"),
        PackageVersion(name="xfsprogs"),
    ),
    "redhat": {
        "7": (
            PackageVersion(
                name="calico-cni-plugin",
                version=CALICO_VERSION,
                release="{0}.el7".format(CALICO_RELEASE),
            ),
            PackageVersion(
                name="containerd",
                version=CONTAINERD_VERSION,
                release="{0}.el7".format(CONTAINERD_RELEASE),
            ),
            PackageVersion(name="container-selinux"),  # TODO #1710
            PackageVersion(name="httpd-tools"),
            PackageVersion(
                name="metalk8s-sosreport",
                version=SHORT_VERSION,
                release="{0}.el7".format(SOSREPORT_RELEASE),
            ),
            PackageVersion(name="yum-plugin-versionlock"),
            PackageVersion(name="yum-utils"),
        ),
        "8": (
            PackageVersion(
                name="calico-cni-plugin",
                version=CALICO_VERSION,
                release="{0}.el8".format(CALICO_RELEASE),
            ),
            PackageVersion(
                name="containerd",
                version=CONTAINERD_VERSION,
                release="{0}.el8".format(CONTAINERD_RELEASE),
            ),
            PackageVersion(name="container-selinux"),
            PackageVersion(name="iptables-ebtables", override="ebtables"),
            PackageVersion(name="httpd-tools"),
            PackageVersion(
                name="metalk8s-sosreport",
                version=SHORT_VERSION,
                release="{0}.el8".format(SOSREPORT_RELEASE),
            ),
            PackageVersion(name="python3-m2crypto", override="m2crypto"),
            PackageVersion(name="python3-dnf-plugin-versionlock"),
            PackageVersion(name="python3-pyOpenSSL", override="python36-pyOpenSSL"),
            PackageVersion(name="yum-utils"),
        ),
    },
    "debian": {
        "18.04": (
            PackageVersion(
                name="calico-cni-plugin",
                version=CALICO_VERSION,
                release=CALICO_RELEASE,
            ),
            PackageVersion(name="iproute2", override="iproute"),
            PackageVersion(
                name="metalk8s-sosreport",
                version=SHORT_VERSION,
                release=SOSREPORT_RELEASE,
            ),
            PackageVersion(name="python-m2crypto", override="m2crypto"),
            PackageVersion(name="python3-openssl", override="python36-pyOpenSSL"),
            PackageVersion(name="sosreport", override="sos"),
        ),
    },
}


def _list_pkgs_for_os_family(os_family: str) -> Dict[str, Tuple[PackageVersion, ...]]:
    """List downloaded packages for a given OS family.

    Arguments:
        os_family: OS_family for which to list packages
    """
    common_pkgs = PACKAGES["common"]
    os_family_pkgs = PACKAGES.get(os_family)
    os_pkgs = {}

    if os_family_pkgs is None:
        raise Exception("No packages for OS family: {}".format(os_family))

    for version, pkgs in os_family_pkgs.items():
        os_override_names = [pkg.override for pkg in pkgs if pkg.override is not None]

        # pylint: disable=cell-var-from-loop
        overridden = filter(
            lambda item: item.name not in os_override_names, common_pkgs
        )

        os_pkgs[version] = tuple(overridden) + os_family_pkgs[version]

    return os_pkgs


REDHAT_PACKAGES = _list_pkgs_for_os_family("redhat")

REDHAT_PACKAGES_MAP = {
    version: {pkg.name: pkg for pkg in pkgs}
    for version, pkgs in REDHAT_PACKAGES.items()
}

DEB_PACKAGES = _list_pkgs_for_os_family("debian")

DEB_PACKAGES_MAP = {
    version: {pkg.name: pkg for pkg in pkgs} for version, pkgs in DEB_PACKAGES.items()
}

# }}}
