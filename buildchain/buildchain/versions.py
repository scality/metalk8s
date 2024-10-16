# coding: utf-8


"""Authoritative listing of image and package versions used in the project.

This module MUST be kept valid in a standalone context, since it is intended
for use in tests and documentation as well.
"""
import operator
import json

from collections import namedtuple
from pathlib import Path
from typing import Any, cast, Dict, Optional, Tuple


Image = namedtuple("Image", ("name", "version", "digest"))

# Project-wide versions {{{

K8S_VERSION_MAJOR: str = "1"
K8S_VERSION_MINOR: str = "29"
K8S_VERSION_PATCH: str = "8"

K8S_SHORT_VERSION: str = f"{K8S_VERSION_MAJOR}.{K8S_VERSION_MINOR}"
K8S_VERSION: str = f"{K8S_SHORT_VERSION}.{K8S_VERSION_PATCH}"

CALICO_VERSION: str = "3.28.1"
SALT_VERSION: str = "3002.9"
CONTAINERD_VERSION: str = "1.6.35"

CONTAINERD_RELEASE: str = "2"
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


REPO_ROOT = (Path(__file__) / "../../../").resolve()
VERSION_FILE = REPO_ROOT / "VERSION"

# Metalk8s version.
# (Those declarations are not mandatory, but they help pylint and mypy).
VERSION_MAJOR: str = ""
VERSION_MINOR: str = ""
VERSION_PATCH: str = ""
VERSION_SUFFIX: str = ""

load_version_information()

SHORT_VERSION: str = f"{VERSION_MAJOR}.{VERSION_MINOR}"
NONSUFFIXED_VERSION: str = f"{SHORT_VERSION}.{VERSION_PATCH}"
VERSION: str = f"{NONSUFFIXED_VERSION}{VERSION_SUFFIX}"

# Get shell ui version from package.json
shell_ui_package_contents = (REPO_ROOT / "shell-ui/package.json").read_text(
    encoding="utf-8"
)
SHELL_UI_VERSION: str = json.loads(shell_ui_package_contents)["version"]

# }}}
# Container images {{{

ROCKY_BASE_IMAGE: str = "docker.io/rockylinux"
ROCKY_BASE_IMAGE_SHA256: str = (
    # rockylinux:8.9.20231119
    "c464612ef7e3d54d658c3eaa4778b5cdc990ec7a4d9ab63b0f00c9994c6ce980"
)

ETCD_VERSION: str = "3.5.15"
ETCD_IMAGE_VERSION: str = f"{ETCD_VERSION}-0"
NGINX_IMAGE_VERSION: str = "1.27.0-alpine"
NODEJS_IMAGE_VERSION: str = "16.14.0"
KEEPALIVED_VERSION: str = "2.3.1"
CERT_MANAGER_VERSION: str = "1.15.3"

# Current build IDs, to be augmented whenever we rebuild the corresponding
# image, e.g. because the `Dockerfile` is changed, or one of the dependencies
# installed in the image needs to be updated.
# This should be reset to 1 when the service exposed by the container changes
# version.
SALT_MASTER_BUILD_ID = 1


def _version_prefix(version: str, prefix: str = "v") -> str:
    return f"{prefix}{version}"


# Digests are quite a mouthful, so:
# pylint:disable=line-too-long
CONTAINER_IMAGES: Tuple[Image, ...] = (
    # Remote images
    Image(
        name="alpine",
        version="3.20.1",
        digest="sha256:b89d9c93e9ed3597455c90a0b88a8bbb5cb7188438f70953fede212a0c4394e0",
    ),
    Image(
        name="alertmanager",
        version="v0.27.0",
        digest="sha256:3053afcdc74adc4ee5f30634454784b7ba96ce7a81f5d998e8f9507cb80bf505",
    ),
    Image(
        name="calico-cni",
        version=_version_prefix(CALICO_VERSION),
        digest="sha256:e486870cfde8189f9ea145148bc353a2c0fca1f445213274023c1d11df69ae19",
    ),
    Image(
        name="calico-node",
        version=_version_prefix(CALICO_VERSION),
        digest="sha256:d8c644a8a3eee06d88825b9a9fec6e7cd3b7c276d7f90afa8685a79fb300e7e3",
    ),
    Image(
        name="calico-kube-controllers",
        version=_version_prefix(CALICO_VERSION),
        digest="sha256:eadb3a25109a5371b7b2dc30d74b2d9b2083eba58abdc034c81f974a48871330",
    ),
    Image(
        name="coredns",
        version="v1.11.1",
        digest="sha256:1eeb4c7316bacb1d4c8ead65571cd92dd21e27359f0d4917f1a5822a73b75db1",
    ),
    Image(
        name="dex",
        version="v2.40.0",
        digest="sha256:3e35d5d0f7dbd33fbadc36a71ff58cf4097ab98d73d22f6cb9a6471a32e028af",
    ),
    Image(
        name="etcd",
        version=ETCD_IMAGE_VERSION,
        digest="sha256:a6dc63e6e8cfa0307d7851762fa6b629afb18f28d8aa3fab5a6e91b4af60026a",
    ),
    Image(
        name="grafana",
        version="11.1.0",
        digest="sha256:079600c9517b678c10cda6006b4487d3174512fd4c6cface37df7822756ed7a5",
    ),
    Image(
        name="k8s-sidecar",
        version="1.26.1",
        digest="sha256:b8d5067137fec093cf48670dc3a1dbb38f9e734f3a6683015c2e89a45db5fd16",
    ),
    Image(
        name="kube-apiserver",
        version=_version_prefix(K8S_VERSION),
        digest="sha256:6f72fa926c9b05e10629fe1a092fd28dcd65b4fdfd0cc7bd55f85a57a6ba1fa5",
    ),
    Image(
        name="kube-controller-manager",
        version=_version_prefix(K8S_VERSION),
        digest="sha256:6f27d63ded20614c68554b477cd7a78eda78a498a92bfe8935cf964ca5b74d0b",
    ),
    Image(
        name="kube-proxy",
        version=_version_prefix(K8S_VERSION),
        digest="sha256:559a093080f70ca863922f5e4bb90d6926d52653a91edb5b72c685ebb65f1858",
    ),
    Image(
        name="kube-scheduler",
        version=_version_prefix(K8S_VERSION),
        digest="sha256:da74a66675d95e39ec25da5e70729da746d0fa0b15ee0da872ac980519bc28bd",
    ),
    Image(
        name="kube-state-metrics",
        version="v2.12.0",
        digest="sha256:b401fae262a5decf83c4311083f8efb4d6ca7b6a733e57b95344cb8dccd14e11",
    ),
    Image(
        name="nginx",
        version=NGINX_IMAGE_VERSION,
        # Do not check the digest for this image, since this one is re-published
        # several times with the same tag
        digest=None,
    ),
    Image(
        name="nginx-ingress-controller",
        version="v1.10.3",
        digest="sha256:b5a5082f8e508cc1aac1c0ef101dc2f87b63d51598a5747d81d6cf6e7ba058fd",
    ),
    Image(
        name="node-exporter",
        version="v1.8.1",
        digest="sha256:fa7fa12a57eff607176d5c363d8bb08dfbf636b36ac3cb5613a202f3c61a6631",
    ),
    Image(
        name="pause",
        version="3.9",
        digest="sha256:e6f1816883972d4be47bd48879a08919b96afcd344132622e4d444987919323c",
    ),
    Image(
        name="prometheus",
        version="v2.53.0",
        digest="sha256:bc1794e85c9e00293351b967efa267ce6af1c824ac875a9d0c7ac84700a8b53e",
    ),
    Image(
        name="prometheus-adapter",
        version="v0.11.2",
        digest="sha256:4a3148185b8cdd3f938f938843de8a930041e81a6c069a121425344ed8384275",
    ),
    Image(
        name="prometheus-config-reloader",
        version="v0.75.0",
        digest="sha256:536f5709c0d8db50188d02c89ba3dd1df7be79124a7f624159ca3564b6168828",
    ),
    Image(
        name="prometheus-operator",
        version="v0.75.0",
        digest="sha256:f347f1b2445e486f1fb05c6ab0fa35adafc3b6510af66423d16da068b31a5dec",
    ),
    Image(
        name="thanos",
        version="v0.35.1",
        digest="sha256:567346c3f6ff2927c2c6c0daad977b2213f62d45eca54d48afd19e6deb902181",
    ),
    # Local images
    Image(
        name="metalk8s-alert-logger",
        version=VERSION,
        digest=None,
    ),
    Image(
        name="metalk8s-keepalived",
        version=VERSION,
        digest=None,
    ),
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
        name="metalk8s-operator",
        version=VERSION,
        digest=None,
    ),
    Image(
        name="salt-master",
        version=f"{SALT_VERSION}-{SALT_MASTER_BUILD_ID}",
        digest=None,
    ),
    Image(
        name="storage-operator",
        version=VERSION,
        digest=None,
    ),
    Image(
        name="loki",
        version="2.9.6",
        digest="sha256:6ca6e2cd3b6f45e0eb298da2920610fde63ecd8ab6c595d9c941c8559d1d9407",
    ),
    Image(
        name="fluent-bit",
        version="3.1.7",
        digest="a93d6119f67f804843f6d4d97dd8448389abed7e821e7513c5b8f387e57edfb9",
    ),
    Image(
        name="cert-manager-controller",
        version=_version_prefix(CERT_MANAGER_VERSION),
        digest="sha256:eee34b3de2dd63f7e5ac459fc2d407662d433fd267d574557b76ee3c7d4bc44f",
    ),
    Image(
        name="cert-manager-webhook",
        version=_version_prefix(CERT_MANAGER_VERSION),
        digest="sha256:fdcb9ac4963fa1bb0c9d7cad38f0ba2c65328aa436f8653c998594d936a96488",
    ),
    Image(
        name="cert-manager-cainjector",
        version=_version_prefix(CERT_MANAGER_VERSION),
        digest="sha256:e0ce8ae280c8d7263663b6a6d3ea5e122632936cde9bdd5321cf7109199f51aa",
    ),
    Image(
        name="cert-manager-acmesolver",
        version=_version_prefix(CERT_MANAGER_VERSION),
        digest="sha256:71468feed486c4cf3ca431d93f996771531ab2e68f261f1a15be845720802a8a",
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
                full_version = f"{self.version}-{self.release}"
        return full_version

    @property
    def rpm_full_name(self) -> str:
        """The package's full name in RPM conventions."""
        if self.full_version:
            return f"{self.name}-{self.full_version}"
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
        PackageVersion(name="gdisk"),
        PackageVersion(name="genisoimage"),
        PackageVersion(name="httpd-tools"),
        PackageVersion(name="iproute"),
        PackageVersion(name="iptables"),
        PackageVersion(name="kubernetes-cni"),
        PackageVersion(name="lvm2"),
        PackageVersion(name="m2crypto"),
        PackageVersion(name="python36-psutil"),
        PackageVersion(name="python36-pyOpenSSL"),
        PackageVersion(name="salt-minion", version=SALT_VERSION),
        PackageVersion(name="socat"),
        PackageVersion(name="tar"),
        PackageVersion(name="util-linux"),
        PackageVersion(name="yum-utils"),
        PackageVersion(name="xfsprogs"),
    ),
    "redhat": {
        "8": (
            PackageVersion(
                name="containerd",
                version=CONTAINERD_VERSION,
                release=f"{CONTAINERD_RELEASE}.el8",
            ),
            PackageVersion(name="container-selinux"),
            PackageVersion(name="iptables-ebtables", override="ebtables"),
            PackageVersion(
                name="metalk8s-sosreport",
                version=NONSUFFIXED_VERSION,
                release=f"{SOSREPORT_RELEASE}.el8",
            ),
            PackageVersion(name="python3-boto3"),
            PackageVersion(name="python3-m2crypto", override="m2crypto"),
            PackageVersion(name="python3-dnf-plugin-versionlock"),
            PackageVersion(name="python3-psutil", override="python36-psutil"),
            PackageVersion(name="python3-pyOpenSSL", override="python36-pyOpenSSL"),
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
        raise Exception(f"No packages for OS family: {os_family}")

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

# }}}

# This variables holds the contents of the rendered
# "salt/metalk8s/versions.json" file (useful in tests)
SALT_VERSIONS_JSON = {
    "kubernetes": {"version": K8S_VERSION},
    "packages": {
        "centos": {
            version: {pkg.name: {"version": pkg.full_version} for pkg in pkgs}
            for version, pkgs in REDHAT_PACKAGES.items()
        },
        "redhat": {
            version: {pkg.name: {"version": pkg.full_version} for pkg in pkgs}
            for version, pkgs in REDHAT_PACKAGES.items()
        },
    },
    "images": {img.name: {"version": img.version} for img in CONTAINER_IMAGES},
    "metalk8s": {"version": VERSION},
}
