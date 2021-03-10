"""Utility methods for Solutions management.

This module contains minion-local operations, see `metalk8s_solutions_k8s.py`
for the K8s operations in the virtual `metalk8s_solutions` module.
"""
import collections
import errno
import os
import logging
import re
import yaml

import salt
from salt.exceptions import CommandExecutionError

log = logging.getLogger(__name__)

CONFIG_FILE = "/etc/metalk8s/solutions.yaml"
CONFIG_KIND = "SolutionsConfiguration"
SUPPORTED_CONFIG_VERSIONS = [
    "solutions.metalk8s.scality.com/{}".format(version) for version in ["v1alpha1"]
]
# https://kubernetes.io/docs/concepts/overview/working-with-objects/names/#dns-label-names
# - contain at most 63 characters
# - contain only lowercase alphanumeric characters or '-'
# - start with an alphanumeric character
# - end with an alphanumeric character
DNS_LABEL_NAME_RFC1123_RE = "^(?!-)[0-9a-z-]{1,63}(?<!-)$"

__virtualname__ = "metalk8s_solutions"


def __virtual__():
    return __virtualname__


def _load_config_file(create=False):
    try:
        with salt.utils.files.fopen(CONFIG_FILE, "r") as fd:
            return yaml.safe_load(fd)
    except IOError as exc:
        if create and exc.errno == errno.ENOENT:
            return _create_config_file()
        msg = 'Failed to load "{}"'.format(CONFIG_FILE)
        raise CommandExecutionError(message=msg) from exc


def _write_config_file(data):
    try:
        with salt.utils.files.fopen(CONFIG_FILE, "w") as fd:
            yaml.safe_dump(data, fd)
    except Exception as exc:
        msg = 'Failed to write Solutions config file at "{}"'.format(CONFIG_FILE)
        raise CommandExecutionError(message=msg) from exc


def _create_config_file():
    default_data = {
        "apiVersion": SUPPORTED_CONFIG_VERSIONS[0],
        "kind": CONFIG_KIND,
        "archives": [],
        "active": {},
    }
    _write_config_file(default_data)
    return default_data


def read_config(create=False):
    """Read the SolutionsConfiguration file and return its contents.

    Empty containers will be used for `archives` and `active` in the return
    value.

    The format should look like the following example:

    ..code-block:: yaml

      apiVersion: metalk8s.scality.com/v1alpha1
      kind: SolutionsConfiguration
      archives:
        - /path/to/solution/archive.iso
      active:
        solution-name: X.Y.Z-suffix (or 'latest')

    If `create` is set to True, this will create an empty configuration file
    if it does not exist yet.
    """
    config = _load_config_file(create=create)

    if config.get("kind") != "SolutionsConfiguration":
        raise CommandExecutionError(
            "Invalid `kind` in configuration ({}), "
            'must be "SolutionsConfiguration"'.format(config.get("kind"))
        )

    if config.get("apiVersion") not in SUPPORTED_CONFIG_VERSIONS:
        raise CommandExecutionError(
            "Invalid `apiVersion` in configuration ({}), "
            "must be one of: {}".format(
                config.get("apiVersion"), ", ".join(SUPPORTED_CONFIG_VERSIONS)
            )
        )

    config.setdefault("archives", [])
    config.setdefault("active", {})

    return config


def configure_archive(archive, create_config=False, removed=False):
    """Add (or remove) a Solution archive in the config file."""
    config = read_config(create=create_config)

    if removed:
        try:
            config["archives"].remove(archive)
        except ValueError:
            pass
    else:
        if archive not in config["archives"]:
            config["archives"].append(archive)

    _write_config_file(config)
    return True


def activate_solution(solution, version="latest"):
    """Set a `version` of a `solution` as being "active"."""
    available = list_available()
    if solution not in available:
        raise CommandExecutionError(
            'Cannot activate Solution "{}": not available'.format(solution)
        )

    # NOTE: this doesn't create a config file, since you can't activate a non-
    #       available version
    config = read_config(create=False)

    if version != "latest":
        if version not in (info["version"] for info in available[solution]):
            raise CommandExecutionError(
                'Cannot activate version "{}" for Solution "{}": '
                "not available".format(version, solution)
            )

    config["active"][solution] = version
    _write_config_file(config)
    return True


def deactivate_solution(solution):
    """Remove a `solution` from the "active" section in configuration."""
    config = read_config(create=False)
    config["active"].pop(solution, None)
    _write_config_file(config)
    return True


SOLUTION_MANIFEST = "manifest.yaml"
SOLUTION_MANIFEST_KIND = "Solution"
SOLUTION_MANIFEST_APIVERSIONS = [
    "solutions.metalk8s.scality.com/v1alpha1",
]


def list_solution_images(mountpoint):
    images_dir = os.path.join(mountpoint, "images")
    solution_images = []

    if not os.path.isdir(images_dir):
        raise CommandExecutionError(
            "{} does not exist or is not a directory".format(images_dir)
        )

    for image in os.listdir(images_dir):
        image_dir = os.path.join(images_dir, image)
        if os.path.isdir(image_dir):
            solution_images.extend(
                [
                    "{}:{}".format(image, version)
                    for version in os.listdir(image_dir)
                    if os.path.isdir(os.path.join(image_dir, version))
                ]
            )

    return solution_images


def _default_solution_manifest(mountpoint, name, version):
    return {
        "spec": {
            "operator": {
                "image": {
                    "name": "{}-operator".format(name),
                    "tag": version,
                },
            },
            "ui": {
                "image": {
                    "name": "{}-ui".format(name),
                    "tag": version,
                },
            },
            "images": list_solution_images(mountpoint),
            "customApiGroups": [],
        },
    }


def read_solution_manifest(mountpoint):
    log.debug("Reading Solution manifest from %r", mountpoint)
    manifest_path = os.path.join(mountpoint, SOLUTION_MANIFEST)

    if not os.path.isfile(manifest_path):
        raise CommandExecutionError(
            'Solution mounted at "{}" has no "{}"'.format(mountpoint, SOLUTION_MANIFEST)
        )

    with salt.utils.files.fopen(manifest_path, "r") as stream:
        manifest = salt.utils.yaml.safe_load(stream)

    if (
        manifest.get("kind") != SOLUTION_MANIFEST_KIND
        or manifest.get("apiVersion") not in SOLUTION_MANIFEST_APIVERSIONS
    ):
        raise CommandExecutionError(
            "Wrong apiVersion/kind for {}".format(manifest_path)
        )

    info = _archive_info_from_manifest(manifest)
    default_manifest = _default_solution_manifest(
        mountpoint, info["name"], info["version"]
    )

    manifest = salt.utils.dictupdate.merge(
        default_manifest, manifest, strategy="recurse"
    )

    return manifest, info


def _archive_info_from_manifest(manifest):
    name = manifest.get("metadata", {}).get("name")
    version = manifest.get("spec", {}).get("version")

    if any(key is None for key in [name, version]):
        raise CommandExecutionError(
            'Missing mandatory key(s) in Solution "{}": must provide '
            '"metadata.name" and "spec.version"'.format(SOLUTION_MANIFEST)
        )

    if not re.match(DNS_LABEL_NAME_RFC1123_RE, name):
        raise CommandExecutionError(
            '"metadata.name" key in Solution {} does not follow naming '
            "convention established by DNS label name RFC1123".format(SOLUTION_MANIFEST)
        )

    display_name = manifest.get("annotations", {}).get(
        "solutions.metalk8s.scality.com/display-name", name
    )

    return {
        "name": name,
        "version": version,
        "display_name": display_name,
        "id": "-".join([name, version]),
    }


def manifest_from_iso(path):
    """Extract the manifest from a Solution ISO

    Arguments:
        path (str): path to an ISO
    """
    log.debug("Reading Solution archive version from %r", path)

    cmd = " ".join(
        [
            "isoinfo",
            "-x",
            r"/{}\;1".format(SOLUTION_MANIFEST.upper()),
            "-i",
            '"{}"'.format(path),
        ]
    )
    result = __salt__["cmd.run_all"](cmd=cmd)
    log.debug("Result: %r", result)

    if result["retcode"] != 0:
        raise CommandExecutionError(
            "Failed to run isoinfo: {}".format(result.get("stderr", result["stdout"]))
        )

    if not result["stdout"]:
        raise CommandExecutionError(
            "Solution ISO at '{}' must contain a '{}' file".format(
                path, SOLUTION_MANIFEST
            )
        )

    try:
        manifest = yaml.safe_load(result["stdout"])
    except yaml.YAMLError as exc:
        raise CommandExecutionError(
            "Failed to load YAML from Solution manifest {}".format(path)
        ) from exc

    return _archive_info_from_manifest(manifest)


def list_available():
    """Get a view of mounted Solution archives.

    Result is in the shape of a dict, with Solution names as keys, and lists
    of mounted archives (each being a dict of various info) as values.
    """
    result = collections.defaultdict(list)

    active_mounts = __salt__["mount.active"]()

    for mountpoint, mount_info in active_mounts.items():
        # Skip mountpoint not in `/srv/scality`
        if not mountpoint.startswith("/srv/scality/"):
            continue

        # Skip MetalK8s mountpoint
        if mountpoint.startswith("/srv/scality/metalk8s-"):
            continue

        # Skip non ISO mountpoint
        if mount_info["fstype"] != "iso9660":
            continue

        try:
            manifest, info = read_solution_manifest(mountpoint)
        except CommandExecutionError as exc:
            log.info(
                "Skipping %s: not a Solution (failed to read/parse %s): %s",
                mountpoint,
                SOLUTION_MANIFEST,
                exc,
            )
            continue

        result[info["name"]].append(
            {
                "name": info["display_name"],
                "id": info["id"],
                "mountpoint": mountpoint,
                "archive": mount_info["alt_device"],
                "version": info["version"],
                "manifest": manifest,
            }
        )

    return dict(result)


OPERATOR_ROLES_MANIFEST = "operator/deploy/role.yaml"


def operator_roles_from_manifest(mountpoint, namespace="default"):
    """Read Solution Operator roles manifest, check if object kinds
    are authorized and fill metadata.namespace key for namespaced
    resources with provided `namespace`, then return a list of
    manifests of Kubernetes objects to create.

    Arguments:
        mountpoint(str): Solution mountpoint path
        namespace(str): Namespace used for namespaced objects

    CLI Examples:

    .. code-block:: bash

        salt-call metalk8s_solutions.operator_roles_from_manifest \
            mountpoint=/srv/scality/example-solution-0.1.0-dev
    """
    manifest_path = os.path.join(mountpoint, OPERATOR_ROLES_MANIFEST)

    if not os.path.isfile(manifest_path):
        return []

    manifests = []
    with salt.utils.files.fopen(manifest_path, "r") as stream:
        for manifest in yaml.safe_load_all(stream):
            if not manifest:
                continue
            kind = manifest.get("kind")
            if kind not in ["Role", "ClusterRole"]:
                raise CommandExecutionError(
                    "Forbidden object kind '{}' provided in '{}'".format(
                        kind, manifest_path
                    )
                )
            if kind == "Role":
                manifest["metadata"]["namespace"] = namespace
            manifests.append(manifest)

    return manifests
