from collections import Mapping
import enum
from functools import wraps
import pathlib

import core

# Common setup steps {{{
class SetupStep(enum.Enum):
    GIT = "git_pull"
    CACHE = "setup_cache"
    SSH = "setup_ssh"
    DOCKER = "wait_for_docker"
    CHECK_DEPS = "check_common_deps"

    @property
    def step(self):
        return getattr(self, self.value)()

    @staticmethod
    def git_pull():
        return core.Git(
            "git pull",
            repourl="%(prop:git_reference)s",
            method="clobber",
            retry_fetch=True,
            halt_on_failure=True,
        )

    @staticmethod
    def setup_cache():
        return NiceShell(
            "Setup proxy cache",
            command=NiceShell._and(
                "curl -s http://proxy-cache/setup.sh | sudo sh",
                ". /usr/local/bin/use_scality_proxy_cache",
            ),
            halt_on_failure=True,
        )

    @staticmethod
    def setup_ssh():
        script = """
mkdir -p ~/.ssh
echo "%(secret:ssh_pub_keys)s" >> ~/.ssh/authorized_keys
IP=$( ip -f inet addr show eth0 | sed -En 's/^.*inet ([0-9.]+).*$/\1/p' )
cat << END
Connect to this worker using:
    ssh eve@$IP
END"""

        return InlineBash(
            "Install SSH keys and report connection info", script=script
        )

    @staticmethod
    def wait_for_docker():
        script = """
for i in {1..150}; do
  docker info &> /dev/null && exit
  sleep 2
done
echo "Could not reach Docker daemon from Buildbot worker" >&2
exit 1"""

        return InlineBash(
            "Wait for Docker daemon to be ready",
            script=script,
            halt_on_failure=True,
        )

    @staticmethod
    def _check_single_dep(dep):
        return NiceShell._if(
            "! {dep} -h 2&> /dev/null",
            NiceShell._seq(
                'echo "Aborting - {dep} not installed and required" >&2',
                "exit 1",
            ),
        )

    @classmethod
    def check_common_deps(cls):
        """Check a usual set of dependencies for a stage's commands."""
        deps = ["unzip", "curl"]

        return NiceShell(
            "Check if {first_deps} and {last_dep} are installed".format(
                first_deps=", ".join(deps[:-1]), last_dep=deps[-1],
            ),
            command=NiceShell._seq(
                *(cls._check_single_dep(dep) for dep in deps)
            ),
            halt_on_failure=True,
        )


def stage_with_setup(setup_steps):
    """Prepend to the stage steps a sequence of common setup steps.

    The available values are stored in the `SetupStep` enum.
    """

    def decorator(stage_factory):
        @wraps(stage_factory)
        def decorated(*args, **kwargs):
            stage = stage_factory(*args, **kwargs)
            for setup_step in reversed(setup_steps):
                stage.steps.insert(0, setup_step.step)
            return stage

        return decorated

    return decorator


# }}}
# Custom "higher-order" steps {{{
class NiceShell(core.ShellCommand):
    STEP_NAME = "ShellCommand"

    def __init__(self, name, command, sudo=False, wrap_env=False, **kwargs):

        if sudo:
            command = "sudo " + command

        self._kwargs = kwargs
        super(NiceShell, self).__init__(name, command, **kwargs)

    @classmethod
    def _fmt_args(cls, *args, join_with=" "):
        return join_with.join(str(arg) for arg in args if args is not None)

    @classmethod
    def _and(cls, *args):
        return cls._fmt_args(*args, join_with=" && ")

    @classmethod
    def _or(cls, *args):
        return cls._fmt_args(*args, join_with=" || ")

    @classmethod
    def _seq(cls, *args):
        return cls._fmt_args(*args, join_with="; ")

    @classmethod
    def _for(cls, values_in, command, var="varname"):
        return 'for {var} in "{values}"; then {command}; done'.format(
            var=var, values=" ".join(map(str, values_in)), command=command,
        )

    @classmethod
    def _if(cls, predicate, _then, _else=None):
        return cls._seq(
            'if "{predicate}"',
            "then {_then}",
            "else {_else}" if _else is not None else None,
            "done",
        ).format(predicate=predicate, _then=_then, _else=_else)

    @classmethod
    def _ssh(cls, *args, ssh_config=None, host=None):
        return "ssh -F {} {} {}".format(ssh_config, host, cls._fmt_args(*args))

    @classmethod
    def _scp(cls, ssh_config, source, dest, through_host=False):
        return "scp {options} -F {conf} {source} {dest}".format(
            options=cls._fmt_args("-3" if through_host else None,),
            conf=ssh_config,
            source=source,
            dest=dest,
        )

    def as_remote(self, ssh_config, host):
        return NiceShell(
            self.name,
            command=self._ssh(ssh_config, host, self.command),
            **self._kwargs,
        )


class InlineBash(NiceShell):
    def __init__(self, name, script, sudo=False, **kwargs):
        self.script = script
        self._kwargs = kwargs

        command = "bash -c '{}'".format(self.script)

        super(InlineBash, self).__init__(name, command, sudo=sudo, **kwargs)


class RunScript(NiceShell):
    STEP_NAME = "ShellCommand"

    def __init__(
        self, name, filepath, *args, sudo=False, wrap_env=False, **kwargs
    ):
        self.filepath = filepath
        self.sudo = sudo
        self._kwargs = kwargs

        command = "bash {} {}".format(self.filepath, " ".join(args),)

        if wrap_env and "env" in kwargs:
            command = "env {values} {command}".format(
                values=self._fmt_args(
                    *(
                        "{}={}".format(key, value)
                        for key, value in kwargs["env"].items()
                    )
                ),
                command=command,
            )

        super(RunScript, self).__init__(name, command, sudo=sudo, **kwargs)

    def as_remote(self, ssh_config, host):
        step = super(RunScript, self).as_remote(ssh_config, host)
        step._command = self._and(
            self._or(
                self._ssh(
                    ssh_config, host, '[[ -f "{}"]]'.format(self.filepath)
                ),
                self._scp(
                    ssh_config,
                    self.filepath,
                    "{}:{}".format(host, self.filepath),
                ),
            ),
            self._ssh(ssh_config, host, step.command),
        )
        return step


class Copy(NiceShell):
    STEP_NAME = "ShellCommand"

    def __init__(self, name, sources, destination=None, **kwargs):
        if destination is not None:
            dest_dir = ARTIFACTS / destination
        else:
            dest_dir = ARTIFACTS

        self.dest_dir = dest_dir
        self.sources = sources
        self._kwargs = kwargs

        super(Copy, self).__init__(
            name,
            command=self.__command('cp -r "$artifact" {s.dest_dir}'),
            **kwargs,
        )

    def __command(self, copy_cmd):
        return self._seq(
            "mkdir -p {s.dest_dir}",
            self._for(self.sources, copy_cmd, var="artifact"),
        ).format(s=self)

    def as_remote(self, ssh_config, host):
        step = super(Copy, self).as_remote(ssh_config, host)
        step._command = self.__command(
            self._scp(
                source="{}:$artifact".format(host),
                dest="{s.dest_dir}",
                ssh_config=ssh_config,
            )
        )
        return step


# }}}
# Artifacts {{{
ARTIFACTS = pathlib.Path("artifacts")


def copy_artifacts(sources, destination=None, **kwargs):
    if isinstance(sources, Mapping):
        yield from [
            Copy(
                "Copy artifacts for '{}'".format(dest),
                sources=source_list,
                destination=dest,
            )
            for dest, source_list in sources.items()
        ]

    yield Copy(
        "Copy artifacts"
        + ("for '{}'".format(destination) if destination is not None else ""),
        sources=sources,
        destination=destination,
        **kwargs,
    )


def stage_with_artifacts(urls=None):
    def decorator(stage_factory):
        @wraps(stage_factory)
        def decorated(*args, **kwargs):
            stage = stage_factory(*args, **kwargs)
            stage.steps.append(
                core.Upload("Upload artifacts", source=ARTIFACTS, urls=urls)
            )
            return stage

        return decorated

    return decorator


# }}}
# Build status {{{
BUILD_STATUS_ARTIFACTS = pathlib.Path("build_status")


def set_final_status(status, stage_name=None):
    build_status_dir = BUILD_STATUS_ARTIFACTS / "build_status"
    step_name = "Set build status to '{}'".format(status)
    if stage_name is not None:
        build_status_dir /= stage_name
        step_name += " for {}".format(stage_name)

    return NiceShell(
        step_name,
        command="mkdir -p {} && echo '{}' > {}".format(
            build_status_dir, status, build_status_dir / "final_status"
        ),
        halt_on_failure=True,
    )


def upload_final_status():
    return core.Upload(
        "Upload final status to artifacts", source=BUILD_STATUS_ARTIFACTS
    )


def stage_with_status(root=False):
    """Decorate a stage to manage build status info in artifacts."""

    def decorator(make_stage):
        @wraps(make_stage)
        def new_make_stage(*args, **kwargs):
            stage = make_stage(*args, **kwargs)
            stage_name = None if root else stage.name
            stage.steps.insert(
                0, set_final_status("FAILED", stage_name=stage_name),
            )
            stage.steps.extend(
                [
                    set_final_status("SUCCESSFUL", stage_name=stage_name),
                    upload_final_status(),
                ]
            )
            return stage

        return new_make_stage

    return decorator


# }}}
# Terraform {{{
TF_VERSION = "0.12.3"
TF_URL = "https://releases.hashicorp.com/terraform/{version}".format(
    version=TF_VERSION
)

DEFAULT_OPENSTACK_ENV = {
    "OS_AUTH_URL": "%(secret:scality_cloud_auth_url)s",
    "OS_REGION_NAME": "%(secret:scality_cloud_region)s",
    "OS_USERNAME": "%(secret:scality_cloud_username)s",
    "OS_PASSWORD": "%(secret:scality_cloud_password)s",
    "OS_TENANT_NAME": "%(secret:scality_cloud_tenant_name)s",
}


def terraform_spawn(tf_path, tf_vars=None, setup_bastion=False):
    def make_env_from_vars(_vars):
        if _vars is None:
            return {}
        return {"TF_VAR_{}".format(key): value for key, value in _vars.items()}

    yield from [
        NiceShell(
            "Download and install Terraform",
            command=" && ".join(
                [
                    'curl --retry 5 -O "{url}/{filepath}"',
                    'sudo unzip "{filepath}" -d /usr/local/sbin/',
                    'rm -f "{filepath}"',
                ]
            ).format(
                url=TF_URL,
                filepath="terraform_{version}_linux_amd64.zip".format(
                    version=TF_VERSION
                ),
            ),
            halt_on_failure=True,
        ),
        NiceShell(
            "Check that Terraform was installed",
            command=(
                "if ! terraform --version 2&> /dev/null; then"
                '  echo "Aborting - Terraform not installed and required" >&2;'
                "  exit 1;"
                "fi"
            ),
            halt_on_failure=True,
        ),
        NiceShell(
            "Initialize Terraform",
            command=(
                "for _ in $(seq 1 12); do"
                "  if terraform init; then"
                "    break;"
                "  else"
                "    rm -rf .terraform/;"
                "    sleep 5;"
                "  fi;"
                "done;"
            ),
            halt_on_failure=True,
        ),
        NiceShell(
            "Validate Terraform deployment description",
            command="terraform validate",
            halt_on_failure=True,
        ),
        NiceShell(
            "Spawn OpenStack virtual infrastructure with Terraform",
            command="terraform apply -auto-approve",
            env={**DEFAULT_OPENSTACK_ENV, **make_env_from_vars(tf_vars)},
            halt_on_failure=True,
        ),
    ]

    if setup_bastion:
        ssh_config = tf_path / "ssh_config"

        # FIXME: this would make more sense to deploy with Terraform
        yield from [
            NiceShell(
                "Send bastion public key to nodes",
                command=NiceShell._for(
                    values_in=["bootstrap", "node1"],
                    var="target_host",
                    command=NiceShell._and(
                        NiceShell._scp(
                            source="bastion:.ssh/bastion.pub",
                            dest="$target_host:.ssh/",
                            through_host=True,
                            ssh_config=ssh_config,
                        ),
                        NiceShell._ssh(
                            "cat .ssh/bastion.pub >> .ssh/authorized_keys",
                            host="$target_host",
                            ssh_config=ssh_config,
                        ),
                    ),
                ),
            ),
            NiceShell(
                "Send bastion private key to bootstrap",
                command=NiceShell._and(
                    NiceShell._ssh(
                        "sudo mkdir -p /etc/metalk8s/pki",
                        host="bootstrap",
                        ssh_config=ssh_config,
                    ),
                    NiceShell._scp(
                        source="bastion:.ssh/bastion",
                        dest="bootstrap:./",
                        through_host=True,
                        ssh_config=ssh_config,
                    ),
                    NiceShell._ssh(
                        "sudo mv bastion /etc/metalk8s/pki/",
                        host="$target_host",
                        ssh_config=ssh_config,
                    ),
                ),
            ),
        ]


def terraform_destroy(tf_path):
    return NiceShell(
        "Destroy Terraform-deployed infrastructure",
        command=(
            "for _ in $(seq 1 3); do"
            "  terraform destroy -auto-approve && break;"
            "done;"
        ),
        env={**DEFAULT_OPENSTACK_ENV},
        workdir=tf_path,
        always_run=True,
        sigterm_time=600,
    )


def remote_wrapper(ssh_config):
    """Generate a wrapper to run steps remotely through SSH."""

    def remote(step):
        host = getattr(step, "__remote_host", None)
        assert host is not None, "Cannot wrap step in SSH without host info."

        remote_factory = getattr(step, "as_remote", None)
        if remote_factory is not None:
            step = remote_factory(ssh_config, host)
        elif isinstance(step, core.ShellCommand):
            # Default implementation for `ShellCommand`
            step._command = 'ssh -F "{ssh_config}" "{host}" "{command}"'.format(
                ssh_config=ssh_config, host=host, command=step.command,
            )

        return step

    return remote


def mark_remote(step=None, host="bootstrap"):
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
        @wraps(step_factory)
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


def on(host):
    """Helper for marking a bunch of steps as running `on` a remote host."""

    def marker(*steps):
        yield from (mark_remote(step, host=host) for step in steps)

    return marker


def stage_with_terraform(tf_vars=None, setup_bastion=False):
    """Decorate a stage to deploy and use Terraform for its tests.

    Can be used in conjunction with the `mark_remote` step decorator, to
    automatically wrap some steps in SSH commands.
    """

    def decorator(make_stage):
        @wraps(make_stage)
        def new_make_stage(*args, **kwargs):
            stage = make_stage(*args, **kwargs)

            # FIXME: add support for KubePod and Local workers as well, that
            #        should be able to use Terraform nowadays
            assert isinstance(
                stage.worker, core.OpenStackWorker
            ), "Only OpenStack workers are supported with Terraform for now."
            tf_path = pathlib.Path(stage.worker.path) / "terraform"

            remote = remote_wrapper(tf_path / "ssh_config")
            maybe_remote_steps = [
                remote(step) if getattr(step, "__remote_host", False) else step
                for step in stage.steps
            ]
            stage._steps = [
                *terraform_spawn(
                    tf_path, tf_vars=tf_vars, setup_bastion=setup_bastion
                ),
                *maybe_remote_steps,
                terraform_destroy(tf_path),
            ]
            return stage

        return new_make_stage

    return decorator


# }}}
# Debug {{{
DEBUG_SCRIPT = """
DEBUG_STAGES="%(prop:debug)s"
DURATION="{timeout}"
if [ -z "$DEBUG_STAGES" ]; then
    REASON="\"debug\" build property not set"
elif [ "$DEBUG_STAGES" = all ]; then
    RUN_STEP=1
    REASON="\"debug\" property set to \"all\""
elif [[ "$DEBUG_STAGES" =~ ^[a-z\-]+(~[a-z\-]+)*$ ]]; then
    IFS="~" read -ra SELECTED <<< "$DEBUG_STAGES"
    for selected in "${{SELECTED[@]}}"; do
    if [ "$selected" = "{stage}" ]; then
        RUN_STEP=1
        REASON="stage selected in \"$DEBUG_STAGES\""
        break
    fi
    done
    if [ "$RUN_STEP" -eq 0 ]; then
    REASON="stage not in \"$DEBUG_STAGES\""
    fi
else
    REASON="invalid \"debug\" property value"
    cat >&2 << EOF
Invalid "debug" build property value "$DEBUG_STAGES".
Must use either:
    - "all", to select all debug stages
    - a single stage name
    - a list of stage names, separated by tilde signs "~",
    e.g. "single-node~multiple-nodes".
EOF
fi
if [ "$RUN_STEP" -eq 1 ]; then
    echo "Step $STEP_NAME - wait $DURATION seconds"
    echo "Reason: $REASON"
    sleep "$DURATION"
else
    echo "Step $STEP_NAME - skip debug"
    echo "Reason: $REASON"
fi"""


def stage_with_debug(timeout=1200):
    """Add a debug step in a stage."""

    def decorator(make_stage):
        @wraps(make_stage)
        def new_make_stage(*args, **kwargs):
            stage = make_stage(*args, **kwargs)
            stage.steps.append(
                InlineBash(
                    "Debug step - wait before allowing resource destruction",
                    script=DEBUG_SCRIPT.format(
                        stage=stage.name, timeout=timeout,
                    ),
                    always_run=True,
                )
            )
            return stage

        return new_make_stage

    return decorator


# }}}
