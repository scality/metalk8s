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

CALICO_VERSION: str = "3.26.1"
K8S_VERSION: str = "1.26.5"
SALT_VERSION: str = "3002.9"
CONTAINERD_VERSION: str = "1.6.21"

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
    # rockylinux:8.7.20230215
    "043e499f2d3a62709f689a1a2d04c904ba2c5e0d3c50e57d9aa9a715536df2bb"
)

ETCD_VERSION: str = "3.5.6"
ETCD_IMAGE_VERSION: str = f"{ETCD_VERSION}-0"
NGINX_IMAGE_VERSION: str = "1.23.3-alpine"
NODEJS_IMAGE_VERSION: str = "16.14.0"
KEEPALIVED_VERSION: str = "2.2.7"

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
        name="alpine",
        version="3.17.2",
        digest="sha256:e2e16842c9b54d985bf1ef9242a313f36b856181f188de21313820e177002501",
    ),
    Image(
        name="alertmanager",
        version="v0.25.0",
        digest="sha256:fd4d9a3dd1fd0125108417be21be917f19cc76262347086509a0d43f29b80e98",
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
        version="v1.9.3",
        digest="sha256:8e352a029d304ca7431c6507b56800636c321cb52289686a581ab70aaa8a2e2a",
    ),
    Image(
        name="dex",
        version="v2.35.3",
        digest="sha256:13964b29d63efcd1490d1a500c4332c642655fe4ca613683fa4dde9a205dd0f7",
    ),
    Image(
        name="etcd",
        version=ETCD_IMAGE_VERSION,
        digest="sha256:dd75ec974b0a2a6f6bb47001ba09207976e625db898d1b16735528c009cb171c",
    ),
    Image(
        name="grafana",
        version="9.3.8-ubuntu",
        digest="sha256:46868e7c0881353e53feb87830abcda380b4d67bff5236948358d4722c422f47",
    ),
    Image(
        name="k8s-sidecar",
        version="1.22.3",
        digest="sha256:84257a97a259f8143061771f7ccd5c551ca0075d22c2dac175fe6c4ee5101803",
    ),
    Image(
        name="kube-apiserver",
        version=_version_prefix(K8S_VERSION),
        digest="sha256:6f89f3e9107e1b7010975137d072d601286d15fb64f572846a4145b9b0e0fc55",
    ),
    Image(
        name="kube-controller-manager",
        version=_version_prefix(K8S_VERSION),
        digest="sha256:a6457911fa41c7706fa1aca6cb50352b1c3e90b70c9707f1e0b6363d3188b81a",
    ),
    Image(
        name="kube-proxy",
        version=_version_prefix(K8S_VERSION),
        digest="sha256:c9df3c07cfe4791905060417fefc09c5b8010ee2b46c13f27015c3f9d4397b6c",
    ),
    Image(
        name="kube-scheduler",
        version=_version_prefix(K8S_VERSION),
        digest="sha256:a3938384e78f260c79dc84e9149bb5d429e817fa9c6905c1471a1e14db527aab",
    ),
    Image(
        name="kube-state-metrics",
        version="v2.8.0",
        digest="sha256:5658d0011a41779ef114f3508143a0e67e4169f64333d0337e731d191ab7edb8",
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
        version="v1.8.1",
        digest="sha256:e5c4824e7375fcf2a393e1c03c293b69759af37a9ca6abdb91b13d78a93da8bd",
    ),
    Image(
        name="nginx-ingress-defaultbackend-amd64",
        version="1.5",
        digest="sha256:4dc5e07c8ca4e23bddb3153737d7b8c556e5fb2f29c4558b7cd6e6df99c512c7",
    ),
    Image(
        name="node-exporter",
        version="v1.5.0",
        digest="sha256:39c642b2b337e38c18e80266fb14383754178202f40103646337722a594d984c",
    ),
    Image(
        name="pause",
        version="3.9",
        digest="sha256:e6f1816883972d4be47bd48879a08919b96afcd344132622e4d444987919323c",
    ),
    Image(
        name="prometheus",
        version="v2.42.0",
        digest="sha256:d2ab0a27783fd4ad96a8853e2847b99a0be0043687b8a5d1ebfb2dd3fa4fd1b8",
    ),
    Image(
        name="prometheus-adapter",
        version="v0.10.0",
        digest="sha256:2f34cb3a04a0fee6034f4d63ce3ee7786c0f762dc9f3bf196c70e894dd92edd1",
    ),
    Image(
        name="prometheus-config-reloader",
        version="v0.63.0",
        digest="sha256:3f976422884ec7744f69084da7736927eb634914a0c035d5a865cf6a6b8eb1b0",
    ),
    Image(
        name="prometheus-operator",
        version="v0.63.0",
        digest="sha256:be4fbe0cfcad639e7a9ce40274917e1e30a3cae045ae27cde35ac84739fdef40",
    ),
    Image(
        name="thanos",
        version="v0.30.2",
        digest="sha256:6b97f63c716781c487da88750850cf5a4e0a1c23af32764e97faefc1383432b1",
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
        version="2.7.0",
        digest="sha256:aff07ff548294b4ab8f82641646dbbec1b9cd80199b45331d3f7cf8e704b6197",
    ),
    Image(
        name="fluent-bit",
        version="2.0.9",
        digest="sha256:d370ad358bc8c392d157ed89eaf4555d49041bf86b29a6a8150981d04d286be8",
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
                release="{0}.el7".format(CONTAINERD_RELEASE),
            ),
            PackageVersion(name="container-selinux"),  # TODO #1710
            PackageVersion(
                name="metalk8s-sosreport",
                version=NONSUFFIXED_VERSION,
                release="{0}.el7".format(SOSREPORT_RELEASE),
            ),
            PackageVersion(name="yum-plugin-versionlock"),
        ),
        "8": (
            PackageVersion(
                name="containerd",
                version=CONTAINERD_VERSION,
                release="{0}.el8".format(CONTAINERD_RELEASE),
            ),
            PackageVersion(name="container-selinux"),
            PackageVersion(name="iptables-ebtables", override="ebtables"),
            PackageVersion(
                name="metalk8s-sosreport",
                version=NONSUFFIXED_VERSION,
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
