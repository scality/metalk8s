"""Helpers to setup Eve stages using Terraform."""
import pathlib

from buildplan import core
from buildplan import shell
from buildplan.dsl import base
from buildplan.dsl import remote

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

TF_PATH = pathlib.Path("deploy")


def _make_env_from_vars(_vars):
    if _vars is None:
        return {}
    return {"TF_VAR_{}".format(key): value for key, value in _vars.items()}


def terraform_spawn(tf_path=TF_PATH, tf_vars=None):
    # TODO: extract installation of dependencies in the worker definition,
    # using a KubePodWorker will help cache those dependencies across builds
    yield from [
        shell.Shell(
            "Download and install Terraform",
            command=shell._and(
                'curl --retry 5 -O "{url}/{filepath}"',
                'sudo unzip "{filepath}" -d /usr/local/sbin/',
                'rm -f "{filepath}"',
            ).format(
                url=TF_URL,
                filepath="terraform_{version}_linux_amd64.zip".format(
                    version=TF_VERSION
                ),
            ),
            halt_on_failure=True,
            hide_step_if=True,
        ),
        shell.Shell(
            "Check that Terraform was installed",
            command=shell._if(
                "! terraform --version 2&> /dev/null",
                _then=shell._seq(
                    'echo "Aborting - Terraform not installed and required" >&2',
                    "exit 1",
                ),
            ),
            halt_on_failure=True,
            hide_step_if=True,
        ),
        shell.Shell(
            "Initialize Terraform",
            command=shell._for(
                "$(seq 1 12)",
                shell._seq(
                    "terraform init && exit", "rm -rf .terraform/", "sleep 5",
                ),
                var="_",
            ),
            workdir=base.BUILD_DIR / tf_path,
            halt_on_failure=True,
            hide_step_if=True,
        ),
        shell.Shell(
            "Validate Terraform deployment description",
            command="terraform validate",
            workdir=base.BUILD_DIR / tf_path,
            halt_on_failure=True,
            hide_step_if=True,
        ),
        shell.Shell(
            "Spawn OpenStack virtual infrastructure with Terraform",
            command="terraform apply -auto-approve",
            env={**DEFAULT_OPENSTACK_ENV, **_make_env_from_vars(tf_vars)},
            workdir=base.BUILD_DIR / tf_path,
            halt_on_failure=True,
        ),
    ]


def terraform_destroy(tf_path):
    return shell.Shell(
        "Destroy Terraform-deployed infrastructure",
        command=shell._for(
            "$(seq 1 3)", "terraform destroy -auto-approve && break", var="_",
        ),
        env=DEFAULT_OPENSTACK_ENV,
        workdir=base.BUILD_DIR / tf_path,
        always_run=True,
        sigterm_time=600,
    )


class WithTerraform(remote.WithRemoteCommands):
    """Decorate a stage to deploy and use Terraform for its tests.

    Can be used in conjunction with the `mark_remote` step decorator, to
    automatically wrap some steps in SSH commands.
    """

    def __init__(self, tf_path=TF_PATH, tf_vars=None):
        self.tf_path = tf_path
        self.tf_vars = tf_vars

    def mutate(self, stage):
        # FIXME: add support for KubePod and Local workers as well, as they
        #        can access OpenStack networks nowadays
        assert isinstance(
            stage.worker, core.OpenStackWorker
        ), "Only OpenStack workers are supported with Terraform for now."

        # Trick to pass down the `ssh_config` to `WithRemoteCommands.mutate`
        self.ssh_config = self.tf_path / "ssh_config"
        super(WithTerraform, self).mutate(stage)

        stage._steps = [
            *terraform_spawn(self.tf_path, tf_vars=self.tf_vars),
            *stage.steps,
            terraform_destroy(self.tf_path),
        ]
