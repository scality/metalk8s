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
K8S_VERSION_MINOR: str = "30"
K8S_VERSION_PATCH: str = "7"

K8S_SHORT_VERSION: str = f"{K8S_VERSION_MAJOR}.{K8S_VERSION_MINOR}"
K8S_VERSION: str = f"{K8S_SHORT_VERSION}.{K8S_VERSION_PATCH}"

CALICO_VERSION: str = "3.29.0"
SALT_VERSION: str = "3002.9"
CONTAINERD_VERSION: str = "1.6.36"

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

ROCKY_BASE_IMAGE: str = "docker.io/rockylinux/rockylinux"
ROCKY_BASE_IMAGE_8_SHA256: str = (
    # rockylinux:8.10-minimal
    "6d2ede107b4f005a638728711dae05d5fbbfd8abd521cecf5ab61196b361c965"
)
ROCKY_BASE_IMAGE_9_SHA256: str = (
    # rockylinux:9.5-minimal
    "2cb86b2d8326a987546dc7fb393f43d43d478fea12ce3ce4accbda571f47f86b"
)

ETCD_VERSION: str = "3.5.16"
ETCD_IMAGE_VERSION: str = f"{ETCD_VERSION}-0"
NGINX_IMAGE_VERSION: str = "1.27.2-alpine"
NODEJS_IMAGE_VERSION: str = "20.11.1"
KEEPALIVED_VERSION: str = "2.3.1"
CERT_MANAGER_VERSION: str = "1.16.1"

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
        version="3.20.3",
        digest="sha256:1e42bbe2508154c9126d48c2b8a75420c3544343bf86fd041fb7527e017a4b4a",
    ),
    Image(
        name="alertmanager",
        version="v0.27.0",
        digest="sha256:3053afcdc74adc4ee5f30634454784b7ba96ce7a81f5d998e8f9507cb80bf505",
    ),
    Image(
        name="calico-cni",
        version=_version_prefix(CALICO_VERSION),
        digest="sha256:eefb9e0007509d0c00fcf254ae35d64f22a2f66215910c05f61e6df0725150e5",
    ),
    Image(
        name="calico-node",
        version=_version_prefix(CALICO_VERSION),
        digest="sha256:f4d8adf6b1a23f9a51099d3fcc1560c254511b15fd660a41e2e55c358fbd5e71",
    ),
    Image(
        name="calico-kube-controllers",
        version=_version_prefix(CALICO_VERSION),
        digest="sha256:ba3ef20f30caa855ddf00e767af973685832546582e7fa457dac14c64d3156d0",
    ),
    Image(
        name="coredns",
        version="v1.11.1",
        digest="sha256:1eeb4c7316bacb1d4c8ead65571cd92dd21e27359f0d4917f1a5822a73b75db1",
    ),
    Image(
        name="dex",
        version="v2.42.0",
        digest="sha256:1b4a6eee8550240b0faedad04d984ca939513650e1d9bd423502c67355e3822f",
    ),
    Image(
        name="etcd",
        version=ETCD_IMAGE_VERSION,
        digest="sha256:c6a9d11cc5c04b114ccdef39a9265eeef818e3d02f5359be035ae784097fdec5",
    ),
    Image(
        name="grafana",
        version="11.2.2-security-01",
        digest="sha256:464eac539793a183381ae198cb3bfcee137f17888ee192b8ac1ae2e867f72a9d",
    ),
    Image(
        name="k8s-sidecar",
        version="1.28.0",
        digest="sha256:4166a019eeafd1f0fef4d867dc5f224f18d84ec8681dbb31f3ca258ecf07bcf2",
    ),
    Image(
        name="kube-apiserver",
        version=_version_prefix(K8S_VERSION),
        digest="sha256:13f4f0f5850b39742101c656b1bbd5090eacf27084ad89b489fc824ef482ed9c",
    ),
    Image(
        name="kube-controller-manager",
        version=_version_prefix(K8S_VERSION),
        digest="sha256:5b8dc26c05b273ce198fbaf4eb179f3b6d6919c6e2116d36dc7f82555374c687",
    ),
    Image(
        name="kube-proxy",
        version=_version_prefix(K8S_VERSION),
        digest="sha256:c4b64b2ac9e3d26c43a81ad11226a127e278a04b6f33f8baa9f5daa162b71c26",
    ),
    Image(
        name="kube-scheduler",
        version=_version_prefix(K8S_VERSION),
        digest="sha256:00b16db991101b7361f2f18035e1c6526c0ce6c9a9568524824b4bccdf1afbd6",
    ),
    Image(
        name="kube-state-metrics",
        version="v2.13.0",
        digest="sha256:639a1e2da549210adddc0391ff91e270e83f7873014aec53258462812f741e6f",
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
        version="v1.11.3",
        digest="sha256:d56f135b6462cfc476447cfe564b83a45e8bb7da2774963b00d12161112270b7",
    ),
    Image(
        name="node-exporter",
        version="v1.8.2",
        digest="sha256:4032c6d5bfd752342c3e631c2f1de93ba6b86c41db6b167b9a35372c139e7706",
    ),
    Image(
        name="pause",
        version="3.10",
        digest="sha256:873ed75102791e5b0b8a7fcd41606c92fcec98d56d05ead4ac5131650004c136",
    ),
    Image(
        name="prometheus",
        version="v2.55.0",
        digest="sha256:378f4e03703557d1c6419e6caccf922f96e6d88a530f7431d66a4c4f4b1000fe",
    ),
    Image(
        name="prometheus-adapter",
        version="v0.12.0",
        digest="sha256:932eae60e2bcf9c4660d6442da066ef1a79b4ea7cc232c61c7303069216ca006",
    ),
    Image(
        name="prometheus-config-reloader",
        version="v0.77.2",
        digest="sha256:c96d4fb1d57f4e7a6504d8da7d1ee9254018039939842bf65e86563b66e5a14f",
    ),
    Image(
        name="prometheus-operator",
        version="v0.77.2",
        digest="sha256:af92db7eac86d012085969ba2c4a5fb97b99cc2720dce805038b28ca4395ec4b",
    ),
    Image(
        name="thanos",
        version="v0.36.1",
        digest="sha256:e542959e1b36d5046083d1b64a7049c356b68a44a173c58b3ae7c0c9ada932d5",
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
        version="3.2.0",
        digest="sha256:882e30c20683a48a8b7ca123e6c19988980b4bd13d2ff221dfcbef0fdc631694",
    ),
    Image(
        name="fluent-bit",
        version="3.1.9",
        digest="sha256:4af3920cc2ff976200e0fc09f23e7ca4ee7d4477a6d592cb496fc39378181b02",
    ),
    Image(
        name="cert-manager-controller",
        version=_version_prefix(CERT_MANAGER_VERSION),
        digest="sha256:ae5e14401cde4dec8bccce7594f829cd491044aa66944272e1d4fccc941ec77c",
    ),
    Image(
        name="cert-manager-webhook",
        version=_version_prefix(CERT_MANAGER_VERSION),
        digest="sha256:6edf44244b2a711be737c4ab8e54e68d9112cc4e87da2ef97a7f76b768f4fde7",
    ),
    Image(
        name="cert-manager-cainjector",
        version=_version_prefix(CERT_MANAGER_VERSION),
        digest="sha256:3c49185718cf454bac559f71c4453b33f1086db48084604247d9acb7a4de2973",
    ),
    Image(
        name="cert-manager-acmesolver",
        version=_version_prefix(CERT_MANAGER_VERSION),
        digest="sha256:14304826ab1a1184e185f952ef7e0bf8e620568b5c17939179efe6f4c6049d8e",
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
