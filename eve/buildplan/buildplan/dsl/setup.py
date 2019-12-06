import enum

from buildplan import core
from buildplan import shell
from buildplan.dsl import base


class SetupStep(enum.Enum):
    CACHE = "setup_cache"
    CHECK_DEPS = "check_common_deps"
    DOCKER = "wait_for_docker"
    GIT = "git_pull"
    SSH = "setup_ssh"

    @property
    def step_factory(self):
        return getattr(self, self.value)

    @staticmethod
    def check_common_deps():
        """Check a usual set of dependencies for a stage's commands."""

        def _check_dep(dep):
            return shell._if(
                "! {dep} -h 2&> /dev/null",
                shell._seq(
                    'echo "Aborting - {dep} not installed and required" >&2',
                    "exit 1",
                ),
            ).format(dep=dep)

        deps = ["unzip", "curl"]

        return shell.Shell(
            "Check if {first_deps} and {last_dep} are installed".format(
                first_deps=", ".join(deps[:-1]), last_dep=deps[-1],
            ),
            command=shell._seq(*(_check_dep(dep) for dep in deps)),
            halt_on_failure=True,
            hide_step_if=True,
        )

    @staticmethod
    def git_pull():
        return core.Git(
            "Git pull",
            repourl="%(prop:git_reference)s",
            method="clobber",
            retry_fetch=True,
            halt_on_failure=True,
            hide_step_if=True,
        )

    @staticmethod
    def setup_cache():
        return shell.Shell(
            "Setup proxy cache",
            command=shell._and(
                "curl -s http://proxy-cache/setup.sh | sudo sh",
                ". /usr/local/bin/use_scality_proxy_cache",
            ),
            halt_on_failure=True,
            hide_step_if=True,
        )

    @staticmethod
    def setup_ssh():
        return shell.Shell(
            "Install SSH keys and report connection info",
            command=shell._seq(
                "mkdir -p ~/.ssh",
                'echo "%(secret:ssh_pub_keys)s" >> ~/.ssh/authorized_keys',
                shell._fmt_args(
                    "IP=$( ip -f inet addr show eth0",
                    "| sed -En 's/^.*inet ([0-9.]+).*$/\\1/p' )",
                ),
                'echo "Connect to this worker using:\n    ssh eve@$IP"',
            ),
        )

    @staticmethod
    def wait_for_docker():
        return shell.Bash(
            "Wait for Docker daemon to be ready",
            command=shell._seq(
                shell._for(
                    "{1..150}",
                    shell._seq("docker info &> /dev/null && exit", "sleep 2"),
                    var="i",
                ),
                'echo "Could not reach Docker daemon from Buildbot worker" >&2',
                "exit 1",
            ),
            inline=True,
            halt_on_failure=True,
            hide_step_if=True,
        )


class WithSetup(base.StageDecorator):
    """Prepend to the stage steps a sequence of common setup steps.

    The available values are stored in the `SetupStep` enum.
    """

    def __init__(self, setup_steps):
        assert all(step in SetupStep for step in setup_steps)
        self.setup_steps = setup_steps

    def mutate(self, stage):
        # We ensure steps are inserted in the right order with `reversed`
        for setup_step in reversed(self.setup_steps):
            stage.steps.insert(0, setup_step.step_factory())
