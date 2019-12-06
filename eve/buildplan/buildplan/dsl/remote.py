import functools
import inspect

from buildplan import core
from buildplan import shell
from buildplan.dsl import base

# Helpers {{{
def _ssh(ssh_config, host, command, *args):
    return "ssh -F {config} {host} {command}".format(
        config=ssh_config, host=host, command=shell._fmt_args(command, *args)
    )


def _scp(ssh_config, source, dest, through_host=False, recursive=False):
    return shell._fmt_args(
        "scp -F {}".format(ssh_config),
        "-r" if recursive else None,
        "-3" if through_host else None,
        source,
        dest,
    )


# }}}
# Remote implementations {{{
# NOTE: we don't expect dependencies of this module to implement remote methods
REMOTE_IMPLEMENTATIONS = []


def implement_remote_for(*step_classes):
    already_implemented = [
        step_cls
        for implemented, _ in REMOTE_IMPLEMENTATIONS
        for step_cls in implemented
    ]
    duplicates = [
        step_cls
        for step_cls in step_classes
        if step_cls in already_implemented
        or getattr(step_cls, "as_remote", False)
    ]
    assert not duplicates, "Duplicate remote implementation for: {}".format(
        ", ".join(duplicates)
    )

    def decorator(step_mutation):
        REMOTE_IMPLEMENTATIONS.append((step_classes, step_mutation))
        return step_mutation

    return decorator


@implement_remote_for(core.ShellCommand, shell.Shell)
def remote_shell(step, ssh_config, host):
    step._command = _ssh(ssh_config, host, "'{}'".format(step.command))
    return step


@implement_remote_for(shell.Bash)
def remote_bash(step, ssh_config, host):
    remote_step = remote_shell(step, ssh_config, host)
    if step._inline:
        return remote_step

    # Add some automatic copy of the local script if necessary
    remote_step._command = shell._and(
        shell._or(
            _ssh(ssh_config, host, '[[ -f "{script}" ]]'),
            "({})".format(shell._and(
                _ssh(ssh_config, host, "'mkdir -p $(dirname {script})'"),
                _scp(ssh_config, source="{script}", dest="{host}:{script}"),
            )),
        ),
        remote_step.command,
    ).format(script=remote_step._script, host=host)
    return remote_step


# }}}
# Stage decorator {{{
def mark_remote_host(step=None, host="bootstrap"):
    """Mark a step (or decorate a step factory) to run remotely through SSH."""
    if isinstance(step, core.Step):
        step.__remote_host = host
        return step

    if step is not None:
        raise ValueError(
            "Can only pass a `Step` object or use as decorator, "
            "received: {}.".format(step)
        )

    def decorator(step_factory):
        @functools.wraps(step_factory)
        def decorated(*args, **kwargs):
            if inspect.isgeneratorfunction(step_factory):
                for step_obj in step_factory(*args, **kwargs):
                    step_obj.__remote_host = host
                    yield step_obj
            else:
                step_obj = step_factory(*args, **kwargs)
                step_obj.__remote_host = host
                return step_obj

        return decorated

    return decorator


def on_remote(host):
    """Helper for marking a bunch of steps as running on a remote host."""

    def marker(*steps):
        yield from (mark_remote_host(step, host=host) for step in steps)

    return marker


class WithRemoteCommands(base.StageDecorator):
    """Wrap `ShellCommand`s in SSH/SCP to run on a remote host.

    Stage factories decorated with this should use the `remote` or
    `mark_remote` helpers to mark which commands to wrap and on which host to
    run them.

    Marked steps should implement `as_remote` to provide a specific
    implementation. Steps that do not inherit from `core.ShellCommand` will
    only be transformed if such a custom implementation is provided.

    All the logic is based on the existence of a properly formatted SSH config
    file.
    """

    def __init__(self, ssh_config):
        self.ssh_config = ssh_config

    def as_remote(self, step, host):
        remote_factory = getattr(
            step,
            "as_remote",
            next(
                (
                    functools.partial(implementation, step)
                    for step_classes, implementation in REMOTE_IMPLEMENTATIONS
                    if step.__class__ in step_classes
                ),
                None,
            ),
        )
        if remote_factory is not None:
            step = remote_factory(self.ssh_config, host)

        return step

    def wrap_step(self, step):
        remote_host = getattr(step, "__remote_host", None)
        if remote_host is not None:
            return self.as_remote(step, host=remote_host)
        return step

    def mutate(self, stage):
        stage._steps = [self.wrap_step(step) for step in stage.steps]


# }}}
