# -*- coding: utf-8 -*-
"""
Module for handling MetalK8s specific calls.
"""
import functools
import itertools
import logging
import os.path
import re
import six
import socket
import tempfile
import textwrap
import time

from salt.pillar import get_pillar
from salt.exceptions import CommandExecutionError
import salt.loader
import salt.template
import salt.utils.args
import salt.utils.files
from salt.utils.hashutils import get_hash

log = logging.getLogger(__name__)

__virtualname__ = "metalk8s"

BOOTSTRAP_CONFIG = "/etc/metalk8s/bootstrap.yaml"


def __virtual__():
    return __virtualname__


def wait_apiserver(retry=10, interval=1, **kwargs):
    """Wait for kube-apiserver to respond.

    Simple "retry" wrapper around the kubernetes.ping Salt execution function.
    """
    status = __salt__["metalk8s_kubernetes.ping"](**kwargs)
    attempts = 1

    while not status and attempts < retry:
        time.sleep(interval)
        status = __salt__["metalk8s_kubernetes.ping"](**kwargs)
        attempts += 1

    if not status:
        log.error("Kubernetes apiserver failed to respond after %d attempts", retry)

    return status


def format_san(names):
    """Format a `subjectAlternativeName` section of a certificate.

    Arguments:
        names ([str]): List if SANs, either IP addresses or DNS names
    """

    def format_name(name):
        # First, try to parse as an IPv4/IPv6 address
        for af_name in ["AF_INET", "AF_INET6"]:
            try:
                af = getattr(socket, af_name)
            except AttributeError:  # pragma: no cover
                log.info("Unkown address family: %s", af_name)
                continue

            try:
                # Parse
                log.debug("Trying to parse %r as %s", name, af_name)
                packed = socket.inet_pton(af, name)
                # Unparse
                log.debug("Trying to unparse %r as %s", packed, af_name)
                unpacked = socket.inet_ntop(af, packed)

                result = f"IP:{unpacked}"
                log.debug('SAN field for %r is "%s"', name, result)
                return result
            except socket.error as exc:
                log.debug("Failed to parse %r as %s: %s", name, af_name, exc)

        # Fallback to assume it's a DNS name
        result = f"DNS:{name}"
        log.debug('SAN field for %r is "%s"', name, result)
        return result

    return ", ".join(sorted(format_name(name) for name in names))


def minions_by_role(role, nodes=None):
    """Return a list of minion IDs in a specific role from Pillar data.

    Arguments:
        role (str): Role to match on
        nodes (dict(str, dict)): Nodes to inspect
            Defaults to `pillar.metalk8s.nodes`.
    """
    if role == "etcd":
        log.debug(f"ARTDBG: fetching minions with etcd role from {nodes}")
    if nodes is None:
        log.debug("ARTDBG: nodes is empty, fetching from pillar")
        try:
            nodes = __pillar__["metalk8s"]["nodes"]
        except Exception as exc:
            raise CommandExecutionError(
                "Can't retrieve 'metalk8s:nodes' pillar"
            ) from exc
    log.debug("ARTDBG: checking nodes pillar for errors")
    pillar_errors = nodes.pop("_errors", None)
    if pillar_errors:
        log.debug(f"ARTDBG: found errors in nodes pillar: {pillar_errors}")
        raise CommandExecutionError(
            "Can't retrieve minions by role because of errors in pillar "
            f"'metalk8s:nodes': {', '.join(pillar_errors)}"
        )

    return [
        node
        for (node, node_info) in nodes.items()
        if role in node_info.get("roles", [])
    ]


def _get_archive_version(info):
    """Extract archive version from info

    Arguments:
        info (str): content of metalk8s product.txt file
    """
    match = re.search(r"^VERSION=(?P<version>.+)$", info, re.MULTILINE)
    return match.group("version") if match else None


def _get_archive_name(info):
    """Extract archive name from info

    Arguments:
        info (str): content of metalk8s product.txt file
    """
    match = re.search(r"^NAME=(?P<name>.+)$", info, re.MULTILINE)
    return match.group("name") if match else None


def _get_archive_info(info):
    """Extract archive information from info

    Arguments:
        info (str): content of metalk8s product.txt file
    """
    return {"version": _get_archive_version(info), "name": _get_archive_name(info)}


def archive_info_from_product_txt(archive):
    """Extract archive information from the 'product.txt' file in an archive.

    Will ensure that the information describes a valid MetalK8s archive (including a
    version).

    Arguments:
        archive (str): path to an ISO or a directory
    """
    if os.path.isdir(archive):
        info = archive_info_from_tree(archive)
        info.update(
            {
                "iso": None,
                "path": archive,
            }
        )
    elif os.path.isfile(archive):
        info = archive_info_from_iso(archive)
        info.update(
            {
                "iso": archive,
                "path": f"/srv/scality/metalk8s-{info['version']}",
            }
        )
    else:
        raise CommandExecutionError(
            f"Invalid archive path {archive}, should be an iso or a directory."
        )

    if info["name"] != "MetalK8s":
        raise CommandExecutionError(
            f"Invalid archive '{archive}', 'NAME' should be 'MetalK8s', found '{info['name']}'."
        )

    if not info["version"]:
        raise CommandExecutionError(
            f"Invalid archive '{archive}', 'VERSION' must be provided."
        )

    return info


def archive_info_from_tree(path):
    """Extract archive information from a directory

    Arguments:
        path (str): path to a directory
    """
    log.debug("Reading archive version from %r", path)

    product_txt = os.path.join(path, "product.txt")

    if not os.path.isfile(product_txt):
        raise CommandExecutionError(f'Path {path} has no "product.txt"')

    with salt.utils.files.fopen(product_txt) as fd:
        return _get_archive_info(fd.read())


def archive_info_from_iso(path):
    """Extract archive information from an iso

    Arguments:
        path (str): path to an iso
    """
    log.debug("Reading archive version from %r", path)

    cmd = " ".join(
        [
            "isoinfo",
            "-x",
            r"/PRODUCT.TXT\;1",
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

    return _get_archive_info(result["stdout"])


def get_mounted_archives():
    """List the MetalK8s ISOs mounted under /srv/scality."""
    archives = {}
    active_mounts = __salt__["mount.active"]()

    for mountpoint, mount_info in active_mounts.items():
        if not mountpoint.startswith("/srv/scality/metalk8s-"):
            continue

        archive = mount_info["alt_device"]
        try:
            archive_info = archive_info_from_product_txt(archive)
        except CommandExecutionError as exc:
            log.info(
                "Skipping %s (mounted at %s): not a valid MetalK8s archive - %s",
                archive,
                mountpoint,
                exc,
            )
            continue

        env_name = f"metalk8s-{archive_info['version']}"
        archives[env_name] = archive_info
    return archives


def get_archives(archives=None):
    """Get a matching between version and path from archives or
    `metalk8s.archives` from pillar if archives is None

    Arguments:
        archives (list): list of path to directory or iso
    """
    if not archives:
        archives = __pillar__.get("metalk8s", {}).get("archives", [])

    if isinstance(archives, six.string_types):
        archives = [str(archives)]
    elif not isinstance(archives, list):
        raise CommandExecutionError(
            f"Invalid archives: list or string expected, got {archives}"
        )

    res = {}
    for archive in archives:
        info = archive_info_from_product_txt(archive)
        env_name = f"metalk8s-{info['version']}"

        # Raise if we have 2 archives with the same version
        if env_name in res:
            error_msg = []
            for dup_version in (res[env_name], info):
                if dup_version["iso"]:
                    path = dup_version["iso"]
                    kind = "ISO"
                else:
                    path = dup_version["path"]
                    kind = "directory"
                error_msg.append(f"{path} ({kind})")
            raise CommandExecutionError(
                f'Two archives have the same version "{info["version"]}":\n- '
                + "\n- ".join(error_msg)
            )

        res.update({env_name: info})
    return res


def check_pillar_keys(keys, refresh=True, pillar=None, raise_error=True):
    """Check that some pillar keys are available and not empty, `None`, 0

    Arguments:
        keys (list): list of keys to check
        refresh (bool): refresh pillar or not
        pillar (dict): pillar dict to check
    """
    # grains object we pass to get_pillar
    # since 3007 we pass __grains__.value()
    # as its scope outlives execution modules
    # cf. https://github.com/saltstack/salt/issues/62477
    try:
        passed_grains = __grains__.value()
    except AttributeError:
        passed_grains = __grains__

    # Ignore `refresh` if pillar is provided
    if not pillar and refresh:
        # Do not use `saltutil.refresh_pillar` as in salt 2018.3 we can not do
        # synchronous pillar refresh
        # See https://github.com/saltstack/salt/issues/20590
        pillar = get_pillar(
            __opts__,
            passed_grains,
            __grains__["id"],
            saltenv=__opts__.get("saltenv"),
            pillarenv=__opts__.get("pillarenv"),
        ).compile_pillar()

    if not pillar:
        pillar = __pillar__

    if not isinstance(keys, list):
        keys = [keys]

    errors = []

    for key_list in keys:
        value = pillar
        if not isinstance(key_list, list):
            key_list = key_list.split(".")

        for key in key_list:
            error = value.get("_errors")
            value = value.get(key)
            if not value:
                if not error:
                    error = [f"Empty value for {key}"]

                errors.append(
                    f"Unable to get {'.'.join(key_list)}:\n\t" + "\n\t".join(error)
                )
                break

    if errors:
        if raise_error:
            raise CommandExecutionError("\n".join(errors))
        else:
            log.error("\n".join(errors))
            return False

    return True


def format_slots(data):
    """Helper to replace slots in nested dictionnary

    "__slots__:salt:module.function(arg1, arg2, kwarg1=abc, kwargs2=cde)

    Arguments:
        data: Data structure to format
    """
    slots_callers = {"salt": __salt__}

    if isinstance(data, list):
        return [format_slots(elt) for elt in data]

    if isinstance(data, dict):
        return {key: format_slots(value) for key, value in data.items()}

    if isinstance(data, six.string_types) and data.startswith("__slot__:"):
        fmt = data.split(":", 2)
        if len(fmt) != 3:
            log.warning(
                "Malformed slot %s: expecting "
                "'__slot__:<caller>:<module>.<function>(...)'",
                data,
            )
            return data
        if fmt[1] not in slots_callers:
            log.warning(
                "Malformed slot '%s': invalid caller, must use one of '%s'",
                data,
                "', '".join(slots_callers.keys()),
            )
            return data

        fun, args, kwargs = salt.utils.args.parse_function(fmt[2])

        try:
            return slots_callers[fmt[1]][fun](*args, **kwargs)
        except Exception as exc:
            raise CommandExecutionError(f"Unable to compute slot '{data}'") from exc

    return data


def cmp_sorted(*args, **kwargs):
    """Helper to sort a list using a function to compare (as `cmp` in Python2)

    Useful when we want to sort a list in Jinja
    """
    if "cmp" in kwargs:
        kwargs["key"] = functools.cmp_to_key(kwargs.pop("cmp"))

    return sorted(*args, **kwargs)


def _error(ret, err_msg):
    ret["result"] = False
    ret["comment"] = err_msg
    return ret


def _atomic_write(
    contents,
    dest,
    user,
    group,
    mode,
    tmp_prefix,
):  # pragma: no cover
    """Minimalistic implementation of an atomic write operation.

    First, we create a temporary file with the desired prefix and attributes.
    Then, we write the contents to it, and flush it in the same directory as
    the target.
    Finally, we link the temporary file contents to the destination filename.
    """
    dir_name = os.path.dirname(dest)

    uid = __salt__["file.user_to_uid"](user)
    gid = __salt__["file.group_to_gid"](group)

    with tempfile.NamedTemporaryFile(
        prefix=tmp_prefix,
        dir=dir_name,
        delete=False,
    ) as tmp_file:
        fd = tmp_file.fileno()
        os.fchmod(fd, mode)
        os.fchown(fd, uid, gid)
        tmp_file.write(contents)
        tmp_file.flush()
        os.fsync(fd)

    try:
        os.rename(tmp_file.name, dest)
    except OSError:
        os.remove(tmp_file.name)
        raise


def _atomic_copy(
    source,
    dest,
    user,
    group,
    mode,
    tmp_prefix,
):  # pragma: no cover
    with salt.utils.files.fopen(source, mode="rb") as f:
        contents = f.read()

    _atomic_write(contents, dest, user, group, mode, tmp_prefix)


def manage_static_pod_manifest(
    name,
    source_filename,
    source,
    source_sum,
    saltenv="base",
):
    """Checks a manifest file and applies changes if necessary.

    Implementation derived from saltstack/salt salt.modules.file.manage_file.

    name:
        Path to the static pod manifest.

    source_filename:
        Path to the cached source file on the minion. The hash sum of this
        file will be compared with the `source_sum` argument to determine
        whether the source file should be fetched again using `cp.cache_file`.

    source:
        Reference for the source file (from the master).

    source_sum:
        Hash sum for the source file.

    CLI Example:
    .. code-block:: bash
        salt '*' metalk8s.manage_static_pod_manifest /etc/kubernetes/manifests/etcd.yaml '' salt://metalk8s/kubernetes/etcd/files/manifest.yaml '{hash_type: 'md5', 'hsum': <md5sum>}' saltenv=metalk8s-2.7.0
    """
    ret = {"name": name, "changes": {}, "comment": "", "result": True}
    desired_user = "root"
    desired_group = "root"
    desired_mode = 0o600
    normalized_mode = salt.utils.files.normalize_mode(oct(desired_mode))

    def _clean_tmp(sfn):
        if sfn.startswith(
            os.path.join(tempfile.gettempdir(), salt.utils.files.TEMPFILE_PREFIX)
        ):
            # Don't remove if it exists in file_roots (any saltenv)
            all_roots = itertools.chain.from_iterable(__opts__["file_roots"].values())
            in_roots = any(sfn.startswith(root) for root in all_roots)
            # Only clean up files that exist
            if os.path.exists(sfn) and not in_roots:
                os.remove(sfn)

    target_dir = os.path.dirname(name)
    target_exists = os.path.isfile(name) or os.path.islink(name)
    hash_type = source_sum.get("hash_type", __opts__["hash_type"])

    if not source:
        return _error(ret, "Must provide a source")
    if not os.path.isdir(target_dir):
        return _error(ret, f"Target directory {target_dir} does not exist")

    if source_filename:
        # File should be already cached, verify its checksum
        cached_hash = get_hash(source_filename, form=hash_type)
        if source_sum.get("hsum") != cached_hash:
            log.debug(
                "Cached source file %s does not match expected checksum, "
                "will fetch it again",
                source_filename,
            )
            source_filename = ""  # Reset source filename to fetch it again

    if not source_filename:
        # File is not present or outdated, cache it
        source_filename = __salt__["cp.cache_file"](source, saltenv)
        if not source_filename:
            return _error(ret, f"Source file '{source}' not found")

        # Recalculate source sum now that file has been cached
        source_sum = {
            "hash_type": hash_type,
            "hsum": get_hash(source_filename, form=hash_type),
        }

    # Check changes if the target file exists
    if target_exists:
        if os.path.islink(name):
            real_name = os.path.realpath(name)
        else:
            real_name = name

        target_hash = get_hash(real_name, hash_type)
        source_hash = source_sum.get("hsum")

        # Check if file needs to be replaced
        if source_hash != target_hash:
            # Print a diff equivalent to diff -u old new
            if __salt__["config.option"]("obfuscate_templates"):
                ret["changes"]["diff"] = "<Obfuscated Template>"
            else:
                try:
                    ret["changes"]["diff"] = __salt__["file.get_diff"](
                        real_name, source_filename, show_filenames=False
                    )
                except CommandExecutionError as exc:
                    ret["changes"]["diff"] = exc.strerror

            # Also check changes to permissions (because _atomic_copy will
            # enforce them before the call to file.check_perms)
            target_stats = __salt__["file.stats"](real_name)
            if target_stats["user"] != desired_user:
                ret["changes"]["user"] = desired_user
            if target_stats["group"] != desired_group:
                ret["changes"]["group"] = desired_group
            if target_stats["mode"] != normalized_mode:
                ret["changes"]["mode"] = normalized_mode

    else:  # target file does not exist
        ret["changes"]["diff"] = "New file"
        real_name = name

    if ret["changes"] and not __opts__["test"]:
        # The file needs to be replaced
        try:
            _atomic_copy(
                source_filename,
                real_name,
                user=desired_user,
                group=desired_group,
                mode=desired_mode,
                tmp_prefix=".",
            )
        except OSError as io_error:
            _clean_tmp(source_filename)
            return _error(ret, f"Failed to commit change: {io_error}")

    # Always enforce perms, even if no changes to contents (this module is
    # idempotent)
    ret, _ = __salt__["file.check_perms"](
        name,
        ret,
        user="root",
        group="root",
        mode="0600",
    )

    if ret["changes"]:
        if __opts__["test"]:
            ret["comment"] = f"File {name} would be updated"
        else:
            ret["comment"] = f"File {name} updated"

    elif not ret["changes"] and ret["result"]:
        ret["comment"] = f"File {name} is in the correct state"

    if source_filename:
        _clean_tmp(source_filename)
    return ret


def get_from_map(value, saltenv=None):
    """Get a value from map.jinja so that we have an up to date value
    computed from defaults.yaml and pillar.

    Basically the same as a `jinja.map_load` but with support for saltenv and
    also hardcoded path to MetalK8s map.jinja.

    Also add logic to retrieve the saltenv using version in the pillar.

    Arguments:

        value (str): Name of the value to retrieve

    CLI Example:

    .. code-block:: bash

        # Retrieve `metalk8s` merge between defaults.yaml and pillar using
        # current node version as saltenv
        salt '*' metalk8s.get_from_map metalk8s

        # Retrieve `metalk8s` from a specific saltenv
        salt '*' metalk8s.get_from_map meltak8s saltenv=my-salt-env
    """
    path = "metalk8s/map.jinja"
    if not saltenv:
        current_version = (
            __pillar__.get("metalk8s", {})
            .get("nodes", {})
            .get(__grains__["id"], {})
            .get("version")
        )
        if not current_version:
            log.warning(
                'Unable to retrieve current running version, fallback on "base"'
            )
            saltenv = "base"
        else:
            saltenv = f"metalk8s-{current_version}"

    tmplstr = textwrap.dedent(
        """\
        {{% from "{path}" import {value} with context %}}
        {{{{ {value} | tojson }}}}
        """.format(  # pylint: disable=consider-using-f-string
            path=path, value=value
        )
    )
    return salt.template.compile_template(
        ":string:",
        salt.loader.render(__opts__, __salt__),
        __opts__["renderer"],
        __opts__["renderer_blacklist"],
        __opts__["renderer_whitelist"],
        input_data=tmplstr,
        saltenv=saltenv,
    )


def get_bootstrap_config():
    """Return the bootstrap config file content"""
    try:
        with salt.utils.files.fopen(BOOTSTRAP_CONFIG, "r") as fd:
            config = salt.utils.yaml.safe_load(fd)
    except IOError as exc:
        msg = f'Failed to load bootstrap config file at "{BOOTSTRAP_CONFIG}"'
        raise CommandExecutionError(message=msg) from exc

    return config


def write_bootstrap_config(config):
    """Write to the bootstrap config file"""
    try:
        with salt.utils.files.fopen(BOOTSTRAP_CONFIG, "w") as fd:
            salt.utils.yaml.safe_dump(config, fd, default_flow_style=False)
    except Exception as exc:
        msg = f'Failed to write bootstrap config file at "{BOOTSTRAP_CONFIG}"'
        raise CommandExecutionError(message=msg) from exc


def configure_archive(archive, remove=False):
    """Add (or remove) a MetalK8s archive in the bootstrap config file."""
    if not remove:
        # raise if the archive does not exist or is invalid
        archive_info_from_product_txt(archive)

    config = get_bootstrap_config()

    if remove:
        try:
            config["archives"].remove(archive)
            msg = "removed from bootstrap configuration"
        except ValueError:
            msg = "already absent in bootstrap configuration"
    else:
        if archive in config["archives"]:
            msg = "already present in bootstrap configuration"
        else:
            config["archives"].append(archive)
            msg = "added to bootstrap configuration"

    write_bootstrap_config(config)

    msg = f"Archive '{archive}' {msg}"
    log.info(msg)
    return msg


def backup_node():
    metalk8s_version = __pillar__["metalk8s"]["cluster_version"]
    archives = get_archives()

    try:
        archive_path = archives[f"metalk8s-{metalk8s_version}"]["path"]
    except KeyError as exc:
        raise CommandExecutionError(
            f"No MetalK8s archive found for version {metalk8s_version}"
        ) from exc

    backup_script = f"{archive_path}/backup.sh"
    result = __salt__["cmd.run_all"](cmd=backup_script)
    log.debug("Result: %r", result)

    if result["retcode"] != 0:
        output = result.get("stderr") or result["stdout"]
        raise CommandExecutionError(f"Failed to run {backup_script}: {output}")

    msg = "Backup successfully generated"
    log.info(msg)
    return msg
