"""Utility methods for Solutions management.

This module contains minion-local operations, see `metalk8s_solutions_k8s.py`
for the K8s operations in the virtual `metalk8s_solutions` module.
"""

import collections
import errno
import functools
import hashlib
import json
import os
import logging
import re
import yaml

import salt
from salt.exceptions import CommandExecutionError

log = logging.getLogger(__name__)

CONFIG_FILE = "/etc/metalk8s/solutions.yaml"
SOLUTIONS_ROOT = "/srv/scality"
CONFIG_KIND = "SolutionsConfiguration"
SUPPORTED_CONFIG_VERSIONS = [
    f"solutions.metalk8s.scality.com/{version}" for version in ["v1alpha1"]
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
        msg = f'Failed to load "{CONFIG_FILE}"'
        raise CommandExecutionError(message=msg) from exc


def _write_config_file(data):
    try:
        with salt.utils.files.fopen(CONFIG_FILE, "w") as fd:
            yaml.safe_dump(data, fd)
    except Exception as exc:
        msg = f'Failed to write Solutions config file at "{CONFIG_FILE}"'
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
            f"Invalid `kind` in configuration ({config.get('kind')}), "
            'must be "SolutionsConfiguration"'
        )

    if config.get("apiVersion") not in SUPPORTED_CONFIG_VERSIONS:
        raise CommandExecutionError(
            f"Invalid `apiVersion` in configuration ({config.get('apiVersion')}), "
            f"must be one of: {', '.join(SUPPORTED_CONFIG_VERSIONS)}"
        )

    config.setdefault("archives", [])
    config.setdefault("active", {})

    return config


def configure_archive(archive, create_config=False, removed=False):
    """Add (or remove) a Solution archive in the config file."""
    config = read_config(create=create_config)

    # Several paths can name one archive (e.g. symlinks to a release shipped
    # in the node image): compare where they lead.
    target = os.path.realpath(archive)
    same = [a for a in config["archives"] if os.path.realpath(a) == target]

    if removed:
        config["archives"] = [a for a in config["archives"] if a not in same]
    elif not same:
        config["archives"].append(archive)

    _write_config_file(config)
    return True


def activate_solution(solution, version="latest"):
    """Set a `version` of a `solution` as being "active"."""
    available = list_available()
    if solution not in available:
        raise CommandExecutionError(
            f'Cannot activate Solution "{solution}": not available'
        )

    # NOTE: this doesn't create a config file, since you can't activate a non-
    #       available version
    config = read_config(create=False)

    if version != "latest":
        if version not in (info["version"] for info in available[solution]):
            raise CommandExecutionError(
                f'Cannot activate version "{version}" for Solution "{solution}": '
                "not available"
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
            f"{images_dir} does not exist or is not a directory"
        )

    for image in os.listdir(images_dir):
        image_dir = os.path.join(images_dir, image)
        if os.path.isdir(image_dir):
            solution_images.extend(
                [
                    f"{image}:{version}"
                    for version in os.listdir(image_dir)
                    if os.path.isdir(os.path.join(image_dir, version))
                ]
            )

    return solution_images


def registry_config(name, *solution_ids):
    """Render the registry configuration exposing the images of several
    versions of the Solution `name` under the `name` prefix, without version.

    A tag shipped by several versions is the same image, the newest version
    serves it.

    CLI Examples:

    .. code-block:: bash

        salt-call metalk8s_solutions.registry_config \
            example-solution example-solution-1.0.0 example-solution-1.1.0
    """
    versions = sorted(
        (solution_id[len(name) + 1 :] for solution_id in solution_ids),
        key=functools.cmp_to_key(__salt__["pkg.version_cmp"]),
        reverse=True,
    )

    images = {}
    for version in versions:
        solution_id = f"{name}-{version}"
        mountpoint = os.path.join(SOLUTIONS_ROOT, solution_id)
        for image in list_solution_images(mountpoint):
            image_name, _, tag = image.partition(":")
            images.setdefault(image_name, {}).setdefault(tag, solution_id)

    config = []
    for image_name, tags in sorted(images.items()):
        tag_list = json.dumps({"name": image_name, "tags": sorted(tags)})
        config.append(f"""
location = /v2/{name}/{image_name}/tags/list {{
    types {{ }} default_type "application/json";
    return 200 '{tag_list}';
}}
""")

        seen_digests = set()
        for tag, solution_id in sorted(tags.items()):
            image_dir = os.path.join(
                SOLUTIONS_ROOT, solution_id, "images", image_name, tag
            )
            with salt.utils.files.fopen(
                os.path.join(image_dir, "manifest.json"), "rb"
            ) as fd:
                digest = hashlib.sha256(fd.read()).hexdigest()

            references = [tag]
            if digest not in seen_digests:
                references.append(f"sha256:{digest}")
            seen_digests.add(digest)

            for reference in references:
                config.append(f"""
location = "/v2/{name}/{image_name}/manifests/{reference}" {{
    alias {image_dir}/;
    types {{ }} default_type "application/vnd.docker.distribution.manifest.v2+json";
    add_header 'Docker-Content-Digest' 'sha256:{digest}';
    try_files manifest.json =404;
    error_page 404 @404_tag;
}}
""")

        # Blobs are looked up in every version still exposing a tag
        paths = " ".join(
            f"{solution_id}/images/{image_name}/{tag}/$1"
            for tag, solution_id in sorted(tags.items())
        )
        config.append(f"""
location ~ "/v2/{name}/{image_name}/blobs/sha256:([a-f0-9]{{64}})" {{
    alias {SOLUTIONS_ROOT}/;
    try_files {paths} =404;
}}
""")

    return "".join(config)


def _default_solution_manifest(mountpoint, name, version):
    return {
        "spec": {
            "operator": {
                "image": {
                    "name": f"{name}-operator",
                    "tag": version,
                },
            },
            "ui": {
                "image": {
                    "name": f"{name}-ui",
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
            f'Solution mounted at "{mountpoint}" has no "{SOLUTION_MANIFEST}"'
        )

    with salt.utils.files.fopen(manifest_path, "r") as stream:
        manifest = salt.utils.yaml.safe_load(stream)

    if (
        manifest.get("kind") != SOLUTION_MANIFEST_KIND
        or manifest.get("apiVersion") not in SOLUTION_MANIFEST_APIVERSIONS
    ):
        raise CommandExecutionError(f"Wrong apiVersion/kind for {manifest_path}")

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
            f'Missing mandatory key(s) in Solution "{SOLUTION_MANIFEST}": must provide '
            '"metadata.name" and "spec.version"'
        )

    if not re.match(DNS_LABEL_NAME_RFC1123_RE, name):
        raise CommandExecutionError(
            f'"metadata.name" key in Solution {SOLUTION_MANIFEST} does not follow naming '
            "convention established by DNS label name RFC1123"
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
            r"/{}\;1".format(  # pylint: disable=consider-using-f-string
                SOLUTION_MANIFEST.upper()
            ),
            "-i",
            f'"{path}"',
        ]
    )
    result = __salt__["cmd.run_all"](cmd=cmd)
    log.debug("Result: %r", result)

    if result["retcode"] != 0:
        raise CommandExecutionError(
            f"Failed to run isoinfo: {result.get('stderr', result['stdout'])}"
        )

    if not result["stdout"]:
        raise CommandExecutionError(
            f"Solution ISO at '{path}' must contain a '{SOLUTION_MANIFEST}' file"
        )

    try:
        manifest = yaml.safe_load(result["stdout"])
    except yaml.YAMLError as exc:
        raise CommandExecutionError(
            f"Failed to load YAML from Solution manifest {path}"
        ) from exc

    return _archive_info_from_manifest(manifest)


def manifest_from_archive(path):
    """Extract the manifest from a Solution archive, ISO or extracted directory

    Arguments:
        path (str): path to an ISO or to a directory holding the ISO contents
    """
    if not os.path.isdir(path):
        return manifest_from_iso(path)

    manifest_path = os.path.join(path, SOLUTION_MANIFEST)
    if not os.path.isfile(manifest_path):
        raise CommandExecutionError(
            f"Solution directory at '{path}' must contain a '{SOLUTION_MANIFEST}' file"
        )

    with salt.utils.files.fopen(manifest_path, "r") as stream:
        try:
            manifest = yaml.safe_load(stream)
        except yaml.YAMLError as exc:
            raise CommandExecutionError(
                f"Failed to load YAML from Solution manifest {manifest_path}"
            ) from exc

    return _archive_info_from_manifest(manifest)


def _solutions_mountpoint(mountpoint):
    # The kernel reports resolved paths: when /srv is a symlink (e.g. to
    # var/srv on image-based hosts), Solution mounts show up under it.
    for root in (SOLUTIONS_ROOT, os.path.realpath(SOLUTIONS_ROOT)):
        if mountpoint.startswith(root + "/"):
            return SOLUTIONS_ROOT + mountpoint[len(root) :]
    return None


def _directory_archives():
    try:
        archives = read_config()["archives"]
    except CommandExecutionError as exc:
        log.info("Cannot read Solutions configuration: %s", exc)
        return {}

    result = {}
    for archive in archives:
        if not os.path.isdir(archive):
            continue
        try:
            result[manifest_from_archive(archive)["id"]] = archive
        except CommandExecutionError as exc:
            log.info("Skipping Solution directory %s: %s", archive, exc)
    return result


def list_available():
    """Get a view of mounted Solution archives.

    Result is in the shape of a dict, with Solution names as keys, and lists
    of mounted archives (each being a dict of various info) as values.
    """
    result = collections.defaultdict(list)

    active_mounts = __salt__["mount.active"](extended=True)
    directory_archives = None

    for mounted_at, mount_info in active_mounts.items():
        # Skip mountpoint not in `/srv/scality`
        mountpoint = _solutions_mountpoint(mounted_at)
        if mountpoint is None:
            continue

        # Skip MetalK8s mountpoint
        if mountpoint.startswith(f"{SOLUTIONS_ROOT}/metalk8s-"):
            continue

        # Keep ISO mounts and bind mounts of extracted Solution directories
        is_iso = mount_info["fstype"] == "iso9660"
        if not is_iso and mount_info.get("root", "/") == "/":
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

        if is_iso:
            archive = mount_info["alt_device"]
        else:
            if directory_archives is None:
                directory_archives = _directory_archives()
            archive = directory_archives.get(info["id"], mountpoint)

        result[info["name"]].append(
            {
                "name": info["display_name"],
                "id": info["id"],
                "mountpoint": mountpoint,
                "mounted_at": mounted_at,
                "archive": archive,
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
                    f"Forbidden object kind '{kind}' provided in '{manifest_path}'"
                )
            if kind == "Role":
                manifest["metadata"]["namespace"] = namespace
            manifests.append(manifest)

    return manifests
