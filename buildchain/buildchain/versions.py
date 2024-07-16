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
K8S_VERSION_MINOR: str = "27"
K8S_VERSION_PATCH: str = "15"

K8S_SHORT_VERSION: str = f"{K8S_VERSION_MAJOR}.{K8S_VERSION_MINOR}"
K8S_VERSION: str = f"{K8S_SHORT_VERSION}.{K8S_VERSION_PATCH}"

CALICO_VERSION: str = "3.26.1"
SALT_VERSION: str = "3002.9"
CONTAINERD_VERSION: str = "1.6.24"

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
    # rockylinux:8.8.20230518
    "85fa0b733cfbcc6e9770829b69ebcc58f51ff71fc9c0f4f5cdf40e3c7f58ccad"
)

ETCD_VERSION: str = "3.5.7"
ETCD_IMAGE_VERSION: str = f"{ETCD_VERSION}-0"
NGINX_IMAGE_VERSION: str = "1.25.2-alpine"
NODEJS_IMAGE_VERSION: str = "16.14.0"
KEEPALIVED_VERSION: str = "2.2.7"

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
        digest="sha256:3be3c67ddba17004c292eafec98cc49368ac273b40b27c8a6621be4471d348d6",
    ),
    Image(
        name="calico-node",
        version=_version_prefix(CALICO_VERSION),
        digest="sha256:8e34517775f319917a0be516ed3a373dbfca650d1ee8e72158087c24356f47fb",
    ),
    Image(
        name="calico-kube-controllers",
        version=_version_prefix(CALICO_VERSION),
        digest="sha256:01ce29ea8f2b34b6cef904f526baed98db4c0581102f194e36f2cd97943f77aa",
    ),
    Image(
        name="coredns",
        version="v1.10.1",
        digest="sha256:a0ead06651cf580044aeb0a0feba63591858fb2e43ade8c9dea45a6a89ae7e5e",
    ),
    Image(
        name="dex",
        version="v2.37.0",
        digest="sha256:f579d00721b0d842328c43a562f50343c54b0048ef2d58d6b54e750c21fc7938",
    ),
    Image(
        name="etcd",
        version=ETCD_IMAGE_VERSION,
        digest="sha256:51eae8381dcb1078289fa7b4f3df2630cdc18d09fb56f8e56b41c40e191d6c83",
    ),
    Image(
        name="grafana",
        version="10.3.3",
        digest="sha256:45335e278648fd393e7fe029be1843d15c63db5555eb383d6d614bd94566d0e5",
    ),
    Image(
        name="k8s-sidecar",
        version="1.25.2",
        digest="sha256:cb4c638ffb1fa1eb49678e0f0423564b39254533f63f4ca6a6c24260472e0c4f",
    ),
    Image(
        name="kube-apiserver",
        version=_version_prefix(K8S_VERSION),
        digest="sha256:bbbc0eb287dbb7507948b1c05ac8f221d1a504e04572e61d4700ff18b2a3afd0",
    ),
    Image(
        name="kube-controller-manager",
        version=_version_prefix(K8S_VERSION),
        digest="sha256:9ff408d91018df95a8505149e778bc7815b261ba8798497ae9319beb2b73304a",
    ),
    Image(
        name="kube-proxy",
        version=_version_prefix(K8S_VERSION),
        digest="sha256:23c54b01075318fe6991b224192faf6d65e9412b954b335efe326977deb30332",
    ),
    Image(
        name="kube-scheduler",
        version=_version_prefix(K8S_VERSION),
        digest="sha256:9a7746f46e126b23098a844b5e3df34ee44b14b666d540a1e92a21ca7bbaac99",
    ),
    Image(
        name="kube-state-metrics",
        version="v2.10.1",
        digest="sha256:af8220f534938de121a694cb7314313a6195c9d494fc30bfa6885b08a276bb82",
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
        version="v1.9.4",
        digest="sha256:5b161f051d017e55d358435f295f5e9a297e66158f136321d9b04520ec6c48a3",
    ),
    Image(
        name="node-exporter",
        version="v1.7.0",
        digest="sha256:4cb2b9019f1757be8482419002cb7afe028fdba35d47958829e4cfeaf6246d80",
    ),
    Image(
        name="pause",
        version="3.9",
        digest="sha256:e6f1816883972d4be47bd48879a08919b96afcd344132622e4d444987919323c",
    ),
    Image(
        name="prometheus",
        version="v2.50.1",
        digest="sha256:4371844079427965a14011f20e6d76283059d637775c663c57a5ea3f8d00ef9a",
    ),
    Image(
        name="prometheus-adapter",
        version="v0.11.1",
        digest="sha256:e6a43c83ab1656f5371f27dedbb4d99e3c60922af439f1868c7efa5e066c6633",
    ),
    Image(
        name="prometheus-config-reloader",
        version="v0.71.2",
        digest="sha256:9f0c16b8c95c908f761d45f95bc04da9dd6482adc8dc0d88dcbc24ceeb5879a1",
    ),
    Image(
        name="prometheus-operator",
        version="v0.71.2",
        digest="sha256:bbf3c671e65b0c115d2196bbe7fed0bcdc59f44b7c93868cd40d1c90cbd3806e",
    ),
    Image(
        name="thanos",
        version="v0.34.1",
        digest="sha256:3da22be605f29ddd83dd8b2daf98890fb5644717b778d9ca466bd68b706b742e",
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
        version="latest",
        digest=None,
    ),
    Image(
        name="loki",
        version="2.9.1",
        digest="sha256:ac8275500db293df1da30ab8782e6eae184a9ad89136231a7d39760a4826f3bc",
    ),
    Image(
        name="fluent-bit",
        version="2.1.10",
        digest="sha256:5766d881ddb1fdacd9c5b24c9f28371ae22d44faaf3f7a510e5e86e37fd6244f",
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
        "7": (
            PackageVersion(
                name="containerd",
                version=CONTAINERD_VERSION,
                release=f"{CONTAINERD_RELEASE}.el7",
            ),
            PackageVersion(name="container-selinux"),  # TODO #1710
            PackageVersion(
                name="metalk8s-sosreport",
                version=NONSUFFIXED_VERSION,
                release=f"{SOSREPORT_RELEASE}.el7",
            ),
            PackageVersion(name="yum-plugin-versionlock"),
        ),
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
