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

CALICO_VERSION: str = "3.19.1"
K8S_VERSION: str = "1.21.2"
SALT_VERSION: str = "3002.6"
CONTAINERD_VERSION: str = "1.4.3"
SOS_VERSION: str = "< 4.0"

CALICO_RELEASE: str = "1"
CONTAINERD_RELEASE: str = "3"
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
VERSION_MAJOR: str
VERSION_MINOR: str
VERSION_PATCH: str
VERSION_SUFFIX: str

load_version_information()

SHORT_VERSION: str = "{}.{}".format(VERSION_MAJOR, VERSION_MINOR)
VERSION: str = "{}.{}{}".format(SHORT_VERSION, VERSION_PATCH, VERSION_SUFFIX)

# Get shell ui version from package.json
shell_ui_package_contents = (REPO_ROOT / "shell-ui/package.json").read_text(
    encoding="utf-8"
)
SHELL_UI_VERSION: str = json.loads(shell_ui_package_contents)["version"]

# }}}
# Container images {{{

CENTOS_BASE_IMAGE: str = "docker.io/centos"
CENTOS_BASE_IMAGE_SHA256: str = (
    # centos:7.9.2009
    "e4ca2ed0202e76be184e75fb26d14bf974193579039d5573fb2348664deef76e"
)

NGINX_IMAGE_VERSION: str = "1.19.6-alpine"
NODEJS_IMAGE_VERSION: str = "14.16.0"

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
        version="v0.22.2",
        digest="sha256:624c1a5063c7c80635081a504c3e1b020d89809651978eb5d0b652a394f3022d",
    ),
    Image(
        name="calico-node",
        version=_version_prefix(CALICO_VERSION),
        digest="sha256:bc4a631d553b38fdc169ea4cb8027fa894a656e80d68d513359a4b9d46836b55",
    ),
    Image(
        name="calico-kube-controllers",
        version=_version_prefix(CALICO_VERSION),
        digest="sha256:904458fe1bd56f995ef76e2c4d9a6831c506cc80f79e8fc0182dc059b1db25a4",
    ),
    Image(
        name="coredns",
        version="v1.8.0",
        digest="sha256:cc8fb77bc2a0541949d1d9320a641b82fd392b0d3d8145469ca4709ae769980e",
    ),
    Image(
        name="dex",
        version="v2.28.1",
        digest="sha256:5e88f2205de172b60fd7af23ac92f34321688a83de9f7de7c9a6f394f6950877",
    ),
    Image(
        name="etcd",
        version="3.4.13-0",
        digest="sha256:4ad90a11b55313b182afc186b9876c8e891531b8db4c9bf1541953021618d0e2",
    ),
    Image(
        name="grafana",
        version="8.0.1",
        digest="sha256:1c3e2fc7896adf9e33be5d062c08066087cb556f63b0a95f8aefe92bd37a6f38",
    ),
    Image(
        name="k8s-sidecar",
        version="1.12.2",
        digest="sha256:ca760f94b35eb78575b170e41d1e19e27359b29245dacfd1c42ae90452ecc08e",
    ),
    Image(
        name="kube-apiserver",
        version=_version_prefix(K8S_VERSION),
        digest="sha256:c86c3855e360b1483008c30c8deaed2b1a92f63eaacec819a90a0ffe04df152b",
    ),
    Image(
        name="kube-controller-manager",
        version=_version_prefix(K8S_VERSION),
        digest="sha256:2ea5e2885485fc20aaa15a0033d50e47ce7c559bf292741c16604984088bd700",
    ),
    Image(
        name="kube-proxy",
        version=_version_prefix(K8S_VERSION),
        digest="sha256:3ee783402715225d6bc483b3a2f8ea11adcb997d00fb5ca2f74734023ade0561",
    ),
    Image(
        name="kube-scheduler",
        version=_version_prefix(K8S_VERSION),
        digest="sha256:d372f36741c015e30d36aef958a021de4af7218c467edac91796fb03aab478b4",
    ),
    Image(
        name="kube-state-metrics",
        version="v2.0.0",
        digest="sha256:eb2f41024a583e8795213726099c6f9432f2d64ab3754cc8ab8d00bdbc328910",
    ),
    Image(
        name="nginx",
        version=NGINX_IMAGE_VERSION,
        digest="sha256:629df02b47c8733258baf6663e308a86cd23f80247d35407022c35fd91a50ea3",
    ),
    Image(
        name="nginx-ingress-controller",
        version="v0.46.0",
        digest="sha256:52f0058bed0a17ab0fb35628ba97e8d52b5d32299fbc03cc0f6c7b9ff036b61a",
    ),
    Image(
        name="nginx-ingress-defaultbackend-amd64",
        version="1.5",
        digest="sha256:4dc5e07c8ca4e23bddb3153737d7b8c556e5fb2f29c4558b7cd6e6df99c512c7",
    ),
    Image(
        name="node-exporter",
        version="v1.1.2",
        digest="sha256:22fbde17ab647ddf89841e5e464464eece111402b7d599882c2a3393bc0d2810",
    ),
    Image(
        name="metallb-controller",
        version="0.10.2-debian-10-r0",
        digest="sha256:573792b177b3fbe2c645f0d4fa084b3d6b8dbb6e0510fac00b0aa256d8315299",
    ),
    Image(
        name="metallb-speaker",
        version="0.10.2-debian-10-r0",
        digest="sha256:8dc5efb75ef21f9052265d6c1571199b0542515cd4a23349c8590c67f9f01b1b",
    ),
    Image(
        name="pause",
        version="3.2",
        digest="sha256:80d28bedfe5dec59da9ebf8e6260224ac9008ab5c11dbbe16ee3ba3e4439ac2c",
    ),
    Image(
        name="prometheus",
        version="v2.27.1",
        digest="sha256:5accb68b56ba452e449a5e552411acaeabbbe0f087acf19a1157ce3dd10a8bed",
    ),
    Image(
        name="k8s-prometheus-adapter-amd64",
        version="v0.8.4",
        digest="sha256:a906f32c5ed3754acd6b197b730cc244a2103f86ac8a1522f55e9c5ea26f820a",
    ),
    Image(
        name="prometheus-config-reloader",
        version="v0.48.1",
        digest="sha256:9bed3dae8023c7a83b906c6c8abd92900697fb3806f14b7f2dbfbc37fe4b7941",
    ),
    Image(
        name="prometheus-operator",
        version="v0.48.1",
        digest="sha256:2e7b61c86ee8b0aef4f5da8b6a4e51ecef249c9ccf4a329c5aa0c81e3fd074c1",
    ),
    # Local images
    Image(
        name="metalk8s-alert-logger",
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
        version="2.2.1",
        digest="sha256:01a278feebe94db18cd83e874db4d4a73713a62be6f3b1503ebe0100a6085c1f",
    ),
    Image(
        name="fluent-bit-plugin-loki",
        version="2.1.0-amd64",
        digest="sha256:bedd17176ced6106404606d31f6d6bfa56b10d769074c0b624fb0bc470b081c2",
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
        PackageVersion(name="runc"),
        PackageVersion(name="salt-minion", version=SALT_VERSION),
        PackageVersion(name="socat"),
        # TODO download built package dependencies
        PackageVersion(name="sos", version=SOS_VERSION),
        PackageVersion(name="util-linux"),
        PackageVersion(name="yum-utils"),
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
            PackageVersion(
                name="metalk8s-sosreport",
                version=SHORT_VERSION,
                release="{0}.el7".format(SOSREPORT_RELEASE),
            ),
            PackageVersion(name="yum-plugin-versionlock"),
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
            PackageVersion(
                name="metalk8s-sosreport",
                version=SHORT_VERSION,
                release="{0}.el8".format(SOSREPORT_RELEASE),
            ),
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
