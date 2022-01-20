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

CALICO_VERSION: str = "3.20.0"
K8S_VERSION: str = "1.22.4"
SALT_VERSION: str = "3002.7"
CONTAINERD_VERSION: str = "1.5.8"

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
        version="v0.23.0",
        digest="sha256:9ab73a421b65b80be072f96a88df756fc5b52a1bc8d983537b8ec5be8b624c5a",
    ),
    Image(
        name="calico-node",
        version=_version_prefix(CALICO_VERSION),
        digest="sha256:7f9aa7e31fbcea7be64b153f8bcfd494de023679ec10d851a05667f0adb42650",
    ),
    Image(
        name="calico-kube-controllers",
        version=_version_prefix(CALICO_VERSION),
        digest="sha256:a850ce8daa84433a5641900693b0f8bc8e5177a4aa4cac8cf4b6cd8c24fd9886",
    ),
    Image(
        name="coredns",
        version="v1.8.4",
        digest="sha256:6e5a02c21641597998b4be7cb5eb1e7b02c0d8d23cce4dd09f4682d463798890",
    ),
    Image(
        name="dex",
        version="v2.30.0",
        digest="sha256:63fc6ee14bcf1868ebfba90885aec76597e0f27bc8e89d1fd238b1f2ee3dea6e",
    ),
    Image(
        name="etcd",
        version="3.5.0-0",
        digest="sha256:9ce33ba33d8e738a5b85ed50b5080ac746deceed4a7496c550927a7a19ca3b6d",
    ),
    Image(
        name="grafana",
        version="8.3.1-ubuntu",
        digest="sha256:599d65bfcf49db3563ce63b2cd884abeff5457f3746203a4395c7d5ddc07a067",
    ),
    Image(
        name="k8s-sidecar",
        version="1.14.2",
        digest="sha256:35654389f8a9b7816193a4811cf3ceb6cf309ece8874e84b3d2d8399e618059b",
    ),
    Image(
        name="kube-apiserver",
        version=_version_prefix(K8S_VERSION),
        digest="sha256:c52183c0c9cd24f0349d36607c95c9d861df569c568877ddf5755e8e8364c110",
    ),
    Image(
        name="kube-controller-manager",
        version=_version_prefix(K8S_VERSION),
        digest="sha256:fc31b9bd0c4fae88bb10f87b17d7c81f18278fd99f6e46832c22a6ad4f2a617c",
    ),
    Image(
        name="kube-proxy",
        version=_version_prefix(K8S_VERSION),
        digest="sha256:7cd096e334df4bdad417fe91616d34d9f0a134af9aed19db12083e39d60e76a5",
    ),
    Image(
        name="kube-scheduler",
        version=_version_prefix(K8S_VERSION),
        digest="sha256:35e7fb6d7e570caa10f9545c46f7c5d852c7c23781efa933d97d1c12dbcd877b",
    ),
    Image(
        name="kube-state-metrics",
        version="v2.2.4",
        digest="sha256:ea4ebe736165cf084fc6fbabf3af07d76bbfe9213d621acb3295353fc36286ae",
    ),
    Image(
        name="nginx",
        version=NGINX_IMAGE_VERSION,
        digest="sha256:629df02b47c8733258baf6663e308a86cd23f80247d35407022c35fd91a50ea3",
    ),
    Image(
        name="nginx-ingress-controller",
        version="v1.0.0",
        digest="sha256:0851b34f69f69352bf168e6ccf30e1e20714a264ab1ecd1933e4d8c0fc3215c6",
    ),
    Image(
        name="nginx-ingress-defaultbackend-amd64",
        version="1.5",
        digest="sha256:4dc5e07c8ca4e23bddb3153737d7b8c556e5fb2f29c4558b7cd6e6df99c512c7",
    ),
    Image(
        name="node-exporter",
        version="v1.2.2",
        digest="sha256:a990408ed288669bbad5b5b374fe1584e54825cde4a911c1a3d6301a907a030c",
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
        version="v2.31.1",
        digest="sha256:a8779cfe553e0331e9046268e26c539fa39ecf90d59836d828163e65e8f4fa35",
    ),
    Image(
        name="k8s-prometheus-adapter-amd64",
        version="v0.8.4",
        digest="sha256:a906f32c5ed3754acd6b197b730cc244a2103f86ac8a1522f55e9c5ea26f820a",
    ),
    Image(
        name="prometheus-config-reloader",
        version="v0.52.1",
        digest="sha256:a3a9de90d09cdd51bd0c80dbfd7b3e2c69ef6c514126968811364b0b6395bd43",
    ),
    Image(
        name="prometheus-operator",
        version="v0.52.1",
        digest="sha256:e2151b743cb808a7353a1749054e3b622bffe01c056a91678288f6e9cec1251f",
    ),
    Image(
        name="thanos",
        version="v0.23.1",
        digest="sha256:2f7d1ddc7877b076efbc3fa626b5003f7f197efbd777cff0eec2b20c2cd68d20",
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
            PackageVersion(name="sos", version="< 4.0"),
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
            PackageVersion(name="sos", version=">= 4.0"),
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
