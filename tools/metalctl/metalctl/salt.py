import abc
from collections import namedtuple
import logging
import functools
import json
import shlex
import subprocess
from typing import Any, Callable, Dict, Optional

from metalctl.errors import Error, StateError
from metalctl import utils


default_logger = logging.getLogger(__name__)


def _get_master_container_id(logger=default_logger):
    found_ret = utils.run_command(
        "crictl",
        "ps",
        "-q",
        "--label",
        "io.kubernetes.pod.namespace=kube-system",
        "--label",
        "io.kubernetes.container.name=salt-master",
        "--state",
        "Running",
    )
    if found_ret.returncode != 0:
        err = (
            "Error when retrieving 'salt-master' container:\n"
            f"stdout: {found_ret.stdout}\nstderr: {found_ret.stderr}"
        )
        logger.debug(err)
        raise Error(err)
    if not found_ret.stdout:
        err = "Failed to find a running 'salt-master' container"
        logger.debug(err)
        raise Error(err)
    found = found_ret.stdout.splitlines()
    if len(found) == 1:
        return found[0]
    err = "Found more than a single running 'salt-master' container"
    logger.debug(f"{err}: %s", ", ".join(found))
    raise Error(err)


def get_salt_master(retries=10, logger=default_logger):
    """Retrieve the container ID for salt-master using 'crictl'."""
    return utils.retry(
        lambda: _get_master_container_id(logger),
        retries=retries,
        sleep=3,
        on_errors=(Error,),
    )


def _salt_cmd(cmd, *args, saltenv=None, pillar=None):
    salt_cmd = [cmd, "--out=json", *args]
    if saltenv:
        salt_cmd.append(f"saltenv={saltenv}")
    if pillar:
        salt_cmd.append(f"pillar={json.dumps(pillar)}")

    return salt_cmd


def _run_master_command(
    *args, saltenv=None, pillar=None, logger=default_logger, **kwargs
):
    salt_master = get_salt_master(logger=logger)  # TODO: add cache
    cmd = _salt_cmd(*args, saltenv=saltenv, pillar=pillar)
    logger.debug(
        "Running '%s' in 'salt-master' container (%s)", " ".join(cmd), salt_master
    )
    return utils.run_command("crictl", "exec", "-i", salt_master, *cmd, **kwargs)


def salt(tgt, mod, *args, logger=default_logger, **kwargs):
    """Invoke 'salt' in the local salt-master container."""
    cmd = ("salt", "--static", tgt, mod, *args)
    result = _run_master_command(*cmd, logger=logger, **kwargs)

    if mod == "state.sls":
        ret = _parse_sls_result(result)
        if any(run.error for run in ret.values()):
            err = MultiStateError({tgt: run for tgt, run in ret.items() if run.error})
            logger.error("An error occured while running '%s': %s", " ".join(cmd), err)
            raise err

    return utils.raise_or_return(result, transform=_read_json, logger=logger)


def salt_run(mod, *args, logger=default_logger, **kwargs):
    """Invoke 'salt-run' in the local salt-master container."""
    result = _run_master_command("salt-run", mod, *args, logger=logger, **kwargs)
    if mod == "state.orchestrate":
        run = _parse_orchestrate_result(result)
        return run.raise_or_return(logger=logger)
    return utils.raise_or_return(result, transform=_read_json, logger=logger)


def salt_call(
    mod,
    *args,
    local_mode=False,
    retcode_passthrough=True,
    saltenv=None,
    pillar=None,
    logger=default_logger,
    **kwargs,
):
    """Invoke 'salt-call' locally."""
    cmd = ["salt-call"]
    if local_mode:
        cmd.append("--local")
    if retcode_passthrough:
        cmd.append("--retcode-passthrough")

    salt_cmd = _salt_cmd(*cmd, mod, *args, saltenv=saltenv, pillar=pillar)
    logger.debug("Running '%s' locally", " ".join(salt_cmd))
    result = utils.run_command(*salt_cmd, **kwargs)

    if mod == "state.sls":
        run = _parse_sls_result(result, minion="local")
        return run.raise_or_return(logger=logger)
    return utils.raise_or_return(
        result, transform=lambda r: _read_json(r)["local"], logger=logger
    )


def _read_json(result: subprocess.CompletedProcess):
    try:
        return json.loads(result.stdout)
    except json.JSONDecodeError as exc:
        cmd_txt = " ".join(result.args)
        raise Error(
            f"Failed to parse JSON output from command '{cmd_txt}':\n{result.stdout}"
        ) from exc


def _parse_sls_result(result: subprocess.CompletedProcess, minion=None):
    data = _read_json(result)
    parsed = {
        tgt: StateRun(ret, returncode=result.returncode) for tgt, ret in data.items()
    }
    if minion:
        return parsed[minion]
    return parsed


def _parse_orchestrate_result(result: subprocess.CompletedProcess):
    out = _read_json(result)
    parsed = StateRun(
        next(iter(out["data"].values())), returncode=out["retcode"], is_orchestrate=True
    )
    return parsed


StateSummary = namedtuple(
    "StateSummary", ("succeeded", "failed", "changed", "run_time")
)


class StateRun:
    """Wraps a state.sls or state.orchestrate result."""

    def __init__(
        self, ret: Dict[str, Any], returncode: int = 0, is_orchestrate: bool = False
    ):
        self.ret = ret
        self.steps = []
        self.summary = None
        self.error = None

        if isinstance(ret, (str, list)):
            # This is likely an error, such as "Specified SLS cannot be found"
            # but we can't check with the returncode (it's always 0 for a "salt"
            # invocation from salt-master container)
            self.error = Error(ret if isinstance(ret, str) else "\n".join(ret))
            return

        self.retcode = ret.pop("retcode", returncode)

        # In other cases, we assume ret is a dict
        for step in sorted(ret.values(), key=lambda d: d.get("__run_num__", 0)):
            sub_ret = None
            if is_orchestrate:
                if step.get("__orchestration__", False):
                    # This is a runner result, which has the runner module in its "name"
                    # field.
                    if step["name"] == "state.orchestrate":
                        # We only store a "__sub_ret__" if it was an orchestrate, which
                        # we parse as a top-level state run.
                        _ret = step["changes"]["return"]
                        sub_ret = StateRun(
                            next(iter(_ret["data"].values())),
                            returncode=_ret["retcode"],
                            is_orchestrate=True,
                        )
                elif step["changes"].get("out") == "highstate":
                    # This is an execution module, called with `salt.function`, so we
                    # will ignore the changes
                    step["__module_ret__"] = step["changes"]["ret"]
                    step["changes"] = {}

            self.steps.append({"__sub_ret__": sub_ret, **step})

        run_time: float = 0  # in ms
        succeeded, changed, failed = 0, 0, 0
        for step in self.steps:
            if step.get("result", False):
                succeeded += 1
            else:
                failed += 1

            sub_ret = step.get("__sub_ret__")
            if sub_ret:
                if sub_ret.summary.changed:
                    changed += 1
            elif step.get("changes"):
                changed += 1

            run_time += step.get("duration", 0)

        self.summary = StateSummary(succeeded, failed, changed, run_time)

        if failed:
            first_failed = next(s for s in self.steps if not s.get("result", False))
            self.error = StateError(first_failed, msg=self.step_to_string(first_failed))

    def to_string(self, indent="", verbose=False):
        step_info = "\n".join(
            self.step_to_string(step, indent="  " + indent, verbose=verbose)
            for step in self.steps
        )
        return (
            f"{indent}Summary: {self.summary.succeeded} succeeded, "
            f"{self.summary.changed} changed, {self.summary.failed} failed\n"
            f"{indent}Duration: {self.summary.run_time:.0f}ms\n"
            f"{indent}Steps:\n{step_info}"
        )

    @staticmethod
    def step_to_string(step, indent="", verbose=True):
        success = step.get("result", False)
        sub_ret = step.get("__sub_ret__")
        step_name = step.get("__id__", repr(step))
        step_info = f"{indent}{step_name}: "
        step_info += "succeeded" if success else "failed"

        changed = False
        if step.get("__orchestration__", False):
            # Only consider things changed if it was an orchestrate, ignore other
            # runner modules
            if sub_ret:
                changed = bool(sub_ret.summary.changed)
        else:
            changed = step.get("changes")

        changed = bool(sub_ret.summary.changed if sub_ret else step.get("changes"))
        if changed:
            step_info += " with changes"

        step_info += f" [took {step.get('duration', 0):.0f} ms]"

        if not success:
            step_info += f"\n{indent}  Comment: {step.get('comment')}"

        if sub_ret:
            step_info += f"\n{sub_ret.to_string(indent='  '+indent)}"
        elif changed and verbose:
            step_info += f"\n{indent}  Changes: {repr(step.get('changes'))}"

        return step_info

    def raise_or_return(self, logger: logging.Logger):
        if self.error:
            logger.error("State execution failed: %s", self.error)
            raise self.error
        logger.info("State execution succeeded: %s", self.to_string(verbose=True))
        return self
