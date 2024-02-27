"""Custom states for MetalK8s."""

import copy
import logging
import six
import time
import traceback
import re

from salt.exceptions import CommandExecutionError


__virtualname__ = "metalk8s"
log = logging.getLogger(__name__)


def __virtual__():
    return __virtualname__


def _error(ret, err_msg):
    ret["result"] = False
    ret["comment"] = err_msg
    return ret


def static_pod_managed(
    name, source, config_files=None, config_files_opt=None, context=None
):
    """Simple helper to edit a static Pod manifest if configuration changes.

    Expects the template to use:
    - `config_digest` variable and store it in the `metadata.annotations`
      section, with the key `metalk8s.scality.com/config-digest`.
    - `metalk8s_version` variable and store it in the `metadata.labels`
      section, with the key `metalk8s.scality.com/version`.

    name:
        Path to the static pod manifest.

    source:
        Source file used to render the manifest.

    config_files:
        List of file to use to generate a digest store in `config_digest` in
        the source template.

    config_files_opt:
        Same as config_files but these files are optional (ignored if the file
        does not exists).

    context:
        Context to use to render the source template.
    """
    ret = {"changes": {}, "comment": "", "name": name, "result": True}

    if not name:
        return _error(ret, "Manifest file name is required")

    if not isinstance(source, six.text_type):
        return _error(ret, "Source must be a single string")

    if not config_files:
        config_files = []

    for config_file in config_files_opt or []:
        if __salt__["file.file_exists"](config_file):
            config_files.append(config_file)
        else:
            log.debug(
                "Ignoring optional config file %s: file does not exist", config_file
            )

    config_file_digests = []
    for config_file in config_files:
        try:
            digest = __salt__["hashutil.digest_file"](config_file, checksum="sha256")
        except CommandExecutionError as exc:
            return _error(
                ret,
                f"Unable to compute digest of config file {config_file}: {exc}",
            )
        config_file_digests.append(digest)

    config_digest = __salt__["hashutil.md5_digest"]("-".join(config_file_digests))

    match = re.search(r"metalk8s-(?P<version>.+)$", __env__)
    metalk8s_version = match.group("version") if match else "unknown"

    context_ = dict(
        context or {}, config_digest=config_digest, metalk8s_version=metalk8s_version
    )

    if __opts__["test"]:
        log.warning("Test functionality is not yet implemented.")
        ret["comment"] = f"The manifest {name} is in the correct state (supposedly)."
        return ret

    # Gather the source file from the server
    try:
        source_filename, source_sum, comment_ = __salt__["file.get_managed"](
            name,
            template="jinja",
            source=source,
            source_hash="",
            source_hash_name=None,
            user="root",
            group="root",
            mode="0600",
            attrs=None,
            saltenv=__env__,
            context=context_,
            defaults=None,
        )
    except Exception as exc:  # pylint: disable=broad-except
        log.debug(traceback.format_exc())
        return _error(ret, f"Unable to get managed file: {exc}")

    if comment_:
        return _error(ret, comment_)
    else:
        try:
            return __salt__["metalk8s.manage_static_pod_manifest"](
                name,
                source_filename,
                source,
                source_sum,
                saltenv=__env__,
            )
        except Exception as exc:  # pylint: disable=broad-except
            log.debug(traceback.format_exc())
            return _error(ret, f"Unable to manage file: {exc}")


def saltutil_cmd(name, **kwargs):
    """Simple `saltutil.cmd` state as `salt.function` do not support roster and
    raw ssh, https://github.com/saltstack/salt/issues/58662"""
    ret = {"name": name, "changes": {}, "result": True, "comment": ""}

    try:
        cmd_ret = __salt__["saltutil.cmd"](fun=name, **kwargs)
    except Exception as exc:  # pylint: disable=broad-except
        ret["result"] = False
        ret["comment"] = str(exc)
        return ret

    try:
        ret["__jid__"] = cmd_ret[next(iter(cmd_ret))]["jid"]
    except (StopIteration, KeyError):
        pass

    fail = set()

    for minion, mdata in cmd_ret.items():
        m_ret = False
        if mdata.get("retcode"):
            ret["result"] = False
            fail.add(minion)
        if mdata.get("failed", False):
            fail.add(minion)
        else:
            if "return" in mdata and "ret" not in mdata:
                mdata["ret"] = mdata.pop("return")
            if "ret" in mdata:
                m_ret = mdata["ret"]
            if "stderr" in mdata or "stdout" in mdata:
                m_ret = {
                    "retcode": mdata.get("retcode"),
                    "stderr": mdata.get("stderr"),
                    "stdout": mdata.get("stdout"),
                }
            if m_ret is False:
                fail.add(minion)

        ret["changes"][minion] = m_ret

    if not cmd_ret:
        ret["result"] = False
        ret["comment"] = "No minions responded"
    else:
        if fail:
            ret["result"] = False
            ret[
                "comment"
            ] = f"Running function {name} failed on minions: {', '.join(fail)}"
        else:
            ret["comment"] = "Function ran successfully"

    return ret


def bootstrap_config_updated(name):
    """A state to update the MetalK8s bootstrap config file to the current version"""
    ret = {
        "name": name,
        "changes": {},
        "result": True,
        "comment": "Bootstrap configuration has been updated",
    }

    try:
        old_config = __salt__["metalk8s.get_bootstrap_config"]()
    except CommandExecutionError as exc:
        ret["result"] = False
        ret["comment"] = str(exc)
        return ret

    config = copy.deepcopy(old_config)

    # Nothing to do

    diff = __utils__["dictdiffer.recursive_diff"](old_config, config, False).diffs

    if not diff:
        ret["comment"] = "Bootstrap configuration already in good state"
        return ret

    if __opts__["test"]:
        ret["result"] = None
        ret["comment"] = "Bootstrap configuration would have been updated"
        return ret

    try:
        __salt__["metalk8s.write_bootstrap_config"](config)
    except CommandExecutionError as exc:
        ret["result"] = False
        ret["comment"] = str(exc)
        return ret

    ret["changes"] = diff
    return ret
