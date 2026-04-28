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
K8S_VERSION_MINOR: str = "34"
K8S_VERSION_PATCH: str = "7"

K8S_SHORT_VERSION: str = f"{K8S_VERSION_MAJOR}.{K8S_VERSION_MINOR}"
K8S_VERSION: str = f"{K8S_SHORT_VERSION}.{K8S_VERSION_PATCH}"

CALICO_VERSION: str = "3.32.0"
SALT_VERSION: str = "3006.25"
CONTAINERD_VERSION: str = "2.2.5"

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
    # rockylinux:9.8-minimal
    "e1d0a9f5ed99d52e7faf03afe7ee32e48b231c4dd9586808b3d1aedf894dff04"
)

ETCD_VERSION: str = "3.6.11"
ETCD_IMAGE_VERSION: str = f"{ETCD_VERSION}-0"
NGINX_IMAGE_VERSION: str = "1.31.2-alpine"
NODEJS_IMAGE_VERSION: str = "20.11.1"
KEEPALIVED_VERSION: str = "2.3.3"
CERT_MANAGER_VERSION: str = "1.17.1"
UI_OPERATOR_VERSION: str = "1.1.0"

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
        version="3.24.1",
        digest="sha256:28bd5fe8b56d1bd048e5babf5b10710ebe0bae67db86916198a6eec434943f8b",
    ),
    Image(
        name="alertmanager",
        version="v0.33.0",
        digest="sha256:af26fbe4dd1886ac0efd7bd55cd9027da262e105b137a376522b7c14c3626e4a",
    ),
    Image(
        name="calico-cni",
        version=_version_prefix(CALICO_VERSION),
        digest="sha256:1cfc6aa9c4dad3575fdf36b78185fd7d68bcd4acc95778f8342be4fb6a851a14",
    ),
    Image(
        name="calico-node",
        version=_version_prefix(CALICO_VERSION),
        digest="sha256:f4fafd8ba641d96c5a91b01e5a519117d77d55dee789a3562ba3ad4aa125b36a",
    ),
    Image(
        name="calico-kube-controllers",
        version=_version_prefix(CALICO_VERSION),
        digest="sha256:adf0ac895796d21bca5383bc81c4cd2614be3a4308085b47857d7999f4cc2b1f",
    ),
    Image(
        name="coredns",
        version="v1.12.4",
        digest="sha256:986f04c2e15e147d00bdd51e8c51bcef3644b13ff806be7d2ff1b261d6dfbae1",
    ),
    Image(
        name="dex",
        version="v2.44.0",
        digest="sha256:5d0656fce7d453c0e3b2706abf40c0d0ce5b371fb0b73b3cf714d05f35fa5f86",
    ),
    Image(
        name="etcd",
        version=ETCD_IMAGE_VERSION,
        digest="sha256:fbab3d2954652f592b2653cc1b9decdbe2a633de9320735e9f364b185b6b309a",
    ),
    Image(
        name="grafana",
        version="13.0.2",
        digest="sha256:5dad0df181cb644a14e13617b913b261a54f7d4fd4510721dba420929f35bea2",
    ),
    Image(
        name="k8s-sidecar",
        version="2.7.3",
        digest="sha256:694950d736c8b532eba4006527ccbdac98fefc9f30b3346ba2de50b6cad91c94",
    ),
    Image(
        name="kube-apiserver",
        version=_version_prefix(K8S_VERSION),
        digest="sha256:b96b8464d152a24c81d7f0435fd2198f8486970cd26a9e0e9c20826c73d1441c",
    ),
    Image(
        name="kube-controller-manager",
        version=_version_prefix(K8S_VERSION),
        digest="sha256:7d759bdc4fef10a3fc1ad60ce9439d58e1a4df7ebb22751f7cc0201ce55f280b",
    ),
    Image(
        name="kube-proxy",
        version=_version_prefix(K8S_VERSION),
        digest="sha256:062519bc0a14769e2f98c6bdff7816a17e6252de3f3c9cb102e6be33fe38d9e2",
    ),
    Image(
        name="kube-scheduler",
        version=_version_prefix(K8S_VERSION),
        digest="sha256:4ab32f707ff84beaac431797999707757b885196b0b9a52d29cb67f95efce7c1",
    ),
    Image(
        name="kube-state-metrics",
        version="v2.19.1",
        digest="sha256:85108987d044b18a098126732f98602df408888c0f7d456241f5abefb9744bc1",
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
        version="v1.15.1",
        digest="sha256:594ceea76b01c592858f803f9ff4d2cb40542cae2060410b2c95f75907d659e1",
    ),
    Image(
        name="node-exporter",
        version="v1.11.1-distroless",
        digest="sha256:6112664fd761bb964d8a2d3d0119d6c8402618a89edbb3a43c8f7b4090fb53c9",
    ),
    Image(
        name="oauth2-proxy",
        version="v7.14.3",
        digest="sha256:68336da945bdaff799262c8d14fb1d1aa9354df5e02b87e0955addc040344618",
    ),
    Image(
        name="pause",
        version="3.10.1",
        # Do not check the digest for this image, since this one is re-published
        # several times with the same tag
        digest=None,
    ),
    Image(
        name="prometheus",
        version="v3.12.0-distroless",
        digest="sha256:f39df5334dee301b885f77e0ff1159f5d8a43bf9db518f885544594799a1e3c2",
    ),
    Image(
        name="prometheus-adapter",
        version="v0.12.0",
        digest="sha256:932eae60e2bcf9c4660d6442da066ef1a79b4ea7cc232c61c7303069216ca006",
    ),
    Image(
        name="prometheus-config-reloader",
        version="v0.91.0",
        digest="sha256:7d9e4eea5f1139e602508871f422b0116c60e87c662f3dcd234d5ab60cd0d8c1",
    ),
    Image(
        name="prometheus-operator",
        version="v0.91.0",
        digest="sha256:9e53e13139218aca79ee000172de73355e9174ef2904585bfad9497fc71aae2d",
    ),
    Image(
        name="thanos",
        version="v0.41.0",
        digest="sha256:cf3e9b292e4302ad4a4955b56379703aea39516607d382a57604a3d003c35d10",
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
        name="ui-operator",
        version=UI_OPERATOR_VERSION,
        digest="sha256:d889e95cc230a8ade3cea8fe4ec231d5b7f1865d557d521254f9f51e49430288",
    ),
    Image(
        name="loki",
        version="3.6.7",
        digest="sha256:3c8fd3570dd9219951a60d3f919c7f31923d10baee578b77bc26c4a0b32d092d",
    ),
    Image(
        name="fluent-bit",
        version="5.0.7",
        digest="sha256:c96ee743cba9b1d5a38654931f411700af80bb7652697afbe67daad46cae237b",
    ),
    Image(
        name="cert-manager-controller",
        version=_version_prefix(CERT_MANAGER_VERSION),
        digest="sha256:9339837eaaa7852509fa4c89c12543721d79d7facf57f29adec7c96fffe408d6",
    ),
    Image(
        name="cert-manager-webhook",
        version=_version_prefix(CERT_MANAGER_VERSION),
        digest="sha256:2933ec670a99524a6860f641ef3720289d784b0bef35bd0b74fc3eb093e71596",
    ),
    Image(
        name="cert-manager-cainjector",
        version=_version_prefix(CERT_MANAGER_VERSION),
        digest="sha256:a8319ee78e94abb11c4fe0b35197a57848ae7eec6c526e369187dc57b2961116",
    ),
    Image(
        name="cert-manager-acmesolver",
        version=_version_prefix(CERT_MANAGER_VERSION),
        digest="sha256:a076f72f33a22dfd3a23727f1e1a069817819406b39e5b0fd9cb97d3338cb8d8",
    ),
    Image(
        name="crl-operator",
        version="v1.0.0",
        digest="sha256:86b4198036c1f83f1d9363a1e2ae78015482ca4fe60cd706939b8730c179ac8a",
    ),
    Image(
        name="disk-management-agent",
        version="v0.0.1-beta.2",
        digest="sha256:8a98623a20f30af4a8b0eb8abe284b15ed8603bd66e13905d32f50e37e6155ed",
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
        PackageVersion(name="containerd.io", version=CONTAINERD_VERSION),
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
        PackageVersion(name="salt-minion", version=SALT_VERSION),
        # NOTE: We pin also the salt package version since repository
        # is not versioned and we want to ensure we use the same version as the
        # salt-minion package
        PackageVersion(name="salt", version=SALT_VERSION),
        PackageVersion(name="socat"),
        PackageVersion(name="tar"),
        PackageVersion(name="util-linux"),
        PackageVersion(name="yum-utils"),
        PackageVersion(name="xfsprogs"),
    ),
    "redhat": {
        "8": (
            PackageVersion(name="container-selinux"),
            PackageVersion(name="iptables-ebtables", override="ebtables"),
            PackageVersion(
                name="metalk8s-sosreport",
                version=NONSUFFIXED_VERSION,
                release=f"{SOSREPORT_RELEASE}.el8",
            ),
            PackageVersion(name="python3-boto3"),
            PackageVersion(name="python3-dnf-plugin-versionlock"),
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
