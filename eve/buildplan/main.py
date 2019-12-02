import collections
import inspect
import pathlib
import sys

from core import (
    Project,
    Stage,
    LocalWorker,
    KubePodWorker,
    OpenStackWorker,
    TriggerStages,
    ShellCommand,
    SetPropertyFromCommand,
    Git,
    Upload,
)
from dsl import (
    InlineBash,
    NiceShell,
    RunScript,
    SetupStep,
    copy_artifacts,
    mark_remote,
    on,
    stage_with_artifacts,
    stage_with_debug,
    stage_with_setup,
    stage_with_status,
    stage_with_terraform,
)
import yaml_print


# Useful paths
BUILD_DIR = pathlib.Path("build")
SRV_SCAL = pathlib.Path("/srv/scality")
DEFAULT_MOUNTPOINT = SRV_SCAL / "metalk8s-%(prop:metalk8s_version)s"
TMP = pathlib.Path("/tmp")
ARTIFACTS_URL = pathlib.Path("%(prop:artifacts_private_url)s")


def build_project():
    project = Project()
    project.add(pre_merge())
    return project


# Stages {{{


@stage_with_status(root=True)
def pre_merge():
    return Stage(
        name="pre-merge",
        worker=LocalWorker(),
        branches=[
            "user/*",
            "feature/*",
            "improvement/*",
            "bugfix/*",
            "w/*",
            "q/*",
            "hotfix/*",
            "dependabot/*",
            "documentation/*",
            "release/*",
        ],
        steps=[
            set_previous_product_version_property(),
            TriggerStages(
                "Trigger build, docs, lint and unit tests stages",
                stages=[build(), buildprev(), docs(), lint(), unit_tests()],
                halt_on_failure=True,
            ),
            set_version_property(),
            set_version_property(
                product_txt_url=ARTIFACTS_URL / "pre/product.txt",
                property_name="metalk8s_version_prev",
            ),
            TriggerStages(
                "Trigger single-node and multiple-nodes stages",
                stages=[
                    single_node_upgrade_centos(),
                    single_node_downgrade_centos(),
                    single_node_install_rhel(),
                    multiple_nodes(),
                ],
            ),
        ],
    )


@stage_with_status()
@stage_with_artifacts(urls=["metalk8s.iso", "SHA256SUM", "product.txt"])
@stage_with_setup([SetupStep.DOCKER, SetupStep.GIT, SetupStep.CACHE])
def build():
    return Stage(
        name="build",
        worker=KubePodWorker(
            path="eve/workers/pod-builder/pod.yaml",
            images=[
                KubePodWorker.Image(
                    "docker-builder", "eve/workers/pod-builder"
                )
            ],
        ),
        steps=[
            build_all(),
            *copy_artifacts(
                [
                    "build.log",
                    "_build/metalk8s.iso",
                    "_build/SHA256SUM",
                    "_build/root/product.txt",
                ]
            ),
        ],
    )


@stage_with_status()
@stage_with_artifacts(
    urls=["pre/metalk8s.iso", "pre/SHA256SUM", "pre/product.txt"]
)
@stage_with_setup([SetupStep.DOCKER, SetupStep.GIT, SetupStep.CACHE])
def buildprev():
    return Stage(
        name="buildprev",
        worker=KubePodWorker(
            path="eve/workers/pod-builder/pod.yaml",
            images=[
                KubePodWorker.Image(
                    "docker-builder", "eve/workers/pod-builder"
                )
            ],
        ),
        steps=[
            build_all(workdir=PREV_WORKDIR),
            *copy_artifacts(
                [
                    PREV_REPO_DIR / src
                    for src in [
                        "build.log",
                        "_build/metalk8s.iso",
                        "_build/SHA256SUM",
                        "_build/root/product.txt",
                    ]
                ],
                destination="pre",
            ),
        ],
    )


@stage_with_status()
@stage_with_artifacts(
    urls=[
        "docs/html/index.html",
        "docs/latex/MetalK8s.pdf",
        "docs/CHANGELOG.md",
    ]
)
@stage_with_setup([SetupStep.GIT, SetupStep.CACHE])
def docs():
    return Stage(
        name="docs",
        worker=KubePodWorker(
            path="eve/workers/pod-docs-builder/pod.yaml",
            images=[
                KubePodWorker.Image(
                    name="doc-builder",
                    context=".",
                    dockerfile="docs/Dockerfile",
                )
            ],
        ),
        steps=[
            build_docs(),
            *copy_artifacts(
                ["docs/_build/*", "CHANGELOG.md"], destination="docs",
            ),
        ],
    )


@stage_with_status()
@stage_with_setup([SetupStep.GIT, SetupStep.CACHE])
def lint():
    return Stage(
        name="lint",
        worker=KubePodWorker(
            path="eve/workers/pod-linter/pod.yaml",
            images=[
                KubePodWorker.Image(
                    name="docker-linter",
                    context="storage-operator",
                    dockerfile="eve/workers/pod-linter/Dockerfile",
                )
            ],
        ),
        steps=[lint_all()],
    )


@stage_with_status()
@stage_with_artifacts()
@stage_with_setup([SetupStep.GIT, SetupStep.CACHE])
def unit_tests():
    return Stage(
        name="unit-tests",
        worker=KubePodWorker(
            path="eve/workers/pod-unit-tests/pod.yaml",
            images=[
                KubePodWorker.Image(
                    name="docker-unit-tests",
                    context="storage-operator",
                    dockerfile="eve/workers/pod-unit-tests/Dockerfile",
                )
            ],
        ),
        steps=[
            ui_unit_tests(),
            operator_unit_tests(),
            *copy_artifacts(["ui/junit"], destination="ui"),
        ],
    )


@stage_with_status()
@stage_with_artifacts(urls=["sosreport/single-node-downgrade-centos"])
@stage_with_setup([SetupStep.GIT, SetupStep.CACHE, SetupStep.SSH])
@stage_with_debug(timeout=3600)
def single_node_downgrade_centos():
    return Stage(
        name="single-node-downgrade-centos",
        worker=OpenStackWorker(
            path="eve/workers/openstack-single-node",
            flavor=OpenStackWorker.Flavor.LARGE,
            image=OpenStackWorker.Image.CENTOS7,
        ),
        steps=[
            *get_iso_from_artifacts(),
            *get_iso_from_artifacts(destination="/tmp", source="pre"),
            *prepare_bootstrap(),
            install_bootstrap(),
            provision_prometheus_volumes(),
            run_tests(
                "Run fast tests locally",
                mode="local",
                filters="post and ci and not multinode and not slow",
            ),
            run_tests(
                "Run slow tests locally",
                mode="local",
                filters="post and ci and not multinode and slow",
            ),
            run_cypress_tests(),
            *copy_artifacts(
                {
                    "ui/cypress": [
                        "ui/cypress/screenshots",
                        "ui/cypress/videos",
                    ],
                    "ui": ["ui/junit"],
                }
            ),
            *run_downgrade(),
            run_tests(
                "Run fast tests locally for previous version",
                mode="local",
                filters="post and ci and not multinode and not slow",
                branch="development/%(prop:product_version_prev)s",
                iso_mountpoint="/srv/scality/metalk8s-%(prop:metalk8s_version_prev)s",
            ),
            collect_sosreport(),
            *copy_artifacts(
                ["/var/tmp/sosreport*"],
                destination="sosreport/single-node-downgrade-centos",
            ),
        ],
    )


@stage_with_status()
@stage_with_artifacts(urls=["sosreport/single-node-upgrade-centos"])
@stage_with_setup([SetupStep.GIT, SetupStep.CACHE, SetupStep.SSH])
@stage_with_debug(timeout=3600)
def single_node_upgrade_centos():
    return Stage(
        name="single-node-upgrade-centos",
        worker=OpenStackWorker(
            path="eve/workers/openstack-single-node",
            flavor=OpenStackWorker.Flavor.LARGE,
            image=OpenStackWorker.Image.CENTOS7,
        ),
        steps=[
            *get_iso_from_artifacts(),
            *get_iso_from_artifacts(destination="/tmp", source="pre"),
            *prepare_bootstrap(
                iso="/tmp/metalk8s.iso", mountpoint=PREV_MOUNTPOINT,
            ),
            install_bootstrap(mountpoint=PREV_MOUNTPOINT),
            run_tests(
                "Run fast tests locally for previous version",
                mode="local",
                filters="post and ci and not multinode and not slow",
                branch="development/%(prop:product_version_prev)s",
                iso_mountpoint=PREV_MOUNTPOINT,
            ),
            *copy_artifacts(
                {
                    "ui/cypress": [
                        "ui/cypress/screenshots",
                        "ui/cypress/videos",
                    ],
                    "ui": ["ui/junit"],
                }
            ),
            *run_upgrade(),
            provision_prometheus_volumes(),
            run_tests(
                "Run fast tests locally",
                mode="local",
                filters="post and ci and not multinode and not slow",
            ),
            collect_sosreport(),
            *copy_artifacts(
                ["/var/tmp/sosreport*"],
                destination="sosreport/single-node-upgrade-centos",
            ),
        ],
    )


@stage_with_status()
@stage_with_artifacts(urls=["sosreport/single-node-install-rhel"])
@stage_with_setup([SetupStep.GIT, SetupStep.CACHE, SetupStep.SSH])
@stage_with_terraform()
@stage_with_debug(timeout=3600)
def single_node_install_rhel():
    return Stage(
        name="single-node-install-rhel",
        worker=OpenStackWorker(
            path="eve/workers/openstack-single-node-rhel",
            flavor=OpenStackWorker.Flavor.MEDIUM,
            image=OpenStackWorker.Image.CENTOS7,
        ),
        steps=[
            *on(host="bootstrap")(
                *get_iso_from_artifacts(),
                *prepare_bootstrap(
                    iso="/tmp/metalk8s.iso", mountpoint=PREV_MOUNTPOINT,
                ),
                install_bootstrap(mountpoint=PREV_MOUNTPOINT),
                provision_prometheus_volumes(),
            ),
            run_tests(
                "Run fast tests",
                filters="post and ci and not multinode and not slow",
                ssh_config="eve/workers/openstack-single-node-rhel/terraform/ssh_config",
            ),
            *on(host="bootstrap")(
                collect_sosreport("cloud-user", "cloud-user"),
                *copy_artifacts(
                    ["/var/tmp/sosreport*"],
                    destination="sosreport/single-node-install-rhel",
                ),
            ),
        ],
    )


@stage_with_status()
@stage_with_artifacts(urls=["sosreport/multiple-nodes"])
@stage_with_setup(
    [SetupStep.GIT, SetupStep.CACHE, SetupStep.SSH, SetupStep.CHECK_DEPS]
)
@stage_with_terraform(tf_vars={"nodes_count": "2"}, setup_bastion=True)
@stage_with_debug(timeout=14400)
def multiple_nodes():
    ssh_config = "eve/workers/openstack-multiple-nodes/terraform/ssh_config"

    return Stage(
        name="multiple-nodes",
        worker=OpenStackWorker(
            path="eve/workers/openstack-multiple-nodes",
            flavor=OpenStackWorker.Flavor.MEDIUM,
            image=OpenStackWorker.Image.CENTOS7,
        ),
        steps=[
            *on(host="bootstrap")(
                *get_iso_from_artifacts(),
                *prepare_bootstrap(),
                install_bootstrap(),
                provision_prometheus_volumes(),
                install_kubectl(),
                enable_ipip(),
            ),
            *on(host="bastion")(
                run_tests(
                    "Run installation scenarii",
                    filters="install and ci and multinodes",
                    ssh_config=ssh_config,
                ),
                run_tests(
                    "Run fast tests",
                    filters="post and ci and multinodes and not slow",
                    ssh_config=ssh_config,
                ),
                run_tests(
                    "Run slow tests",
                    filters="post and ci and multinodes and slow",
                    ssh_config=ssh_config,
                ),
            ),
            # TODO: mutualize, maybe have a way to generate for loops, or just
            # a single one and only accept single steps in multi-host `on`...
            *on(host="bootstrap")(
                collect_sosreport(),
                *copy_artifacts(
                    ["/var/tmp/sosreport*"],
                    destination="sosreport/single-multiple-nodes/bootstrap",
                ),
            ),
            *on(host="node1")(
                collect_sosreport(),
                *copy_artifacts(
                    ["/var/tmp/sosreport*"],
                    destination="sosreport/single-multiple-nodes/node1",
                ),
            ),
        ],
    )


# }}}
# Steps {{{


def build_all(**kwargs):
    return ShellCommand(
        "Build everything",
        command="./doit.sh -n 4",
        env={"PYTHON_SYS": "python3.6"},
        use_pty=True,
        halt_on_failure=True,
        **kwargs,
    )


def build_docs():
    return ShellCommand(
        "Build documentation",
        command="tox --workdir /tmp/tox -e docs -- html latexpdf",
        env={"READTHEDOCS": "True"},
        halt_on_failure=True,
    )


def lint_all():
    return ShellCommand(
        "Run all linting targets",
        command="./doit.sh lint",
        use_pty=True,
        halt_on_failure=False,
    )


def ui_unit_tests():
    return ShellCommand(
        "Run all UI unit tests",
        command=" & ".join(
            [
                "npm ci --no-cache --no-save -q --no-update-notifier",
                "npm run test:nowatch --no-update-notifier",
            ]
        ),
        workdir="build/ui",
        halt_on_failure=False,
    )


def operator_unit_tests():
    return ShellCommand(
        "Run all storage-operator unit tests",
        command="go test -cover -v ./...",
        workdir="build/storage-operator",
        halt_on_failure=False,
    )


def set_version_property(
    product_txt_url="%(prop:artifacts_private_url)s/product.txt",
    property_name="metalk8s_version",
):
    return SetPropertyFromCommand(
        "Set version as property from built artifacts",
        property_name=property_name,
        command="bash -c '{}'".format(
            NiceShell._and(
                '. <(curl -s "{}")'.format(product_txt_url), "echo $VERSION",
            )
        ),
    )


def get_iso_from_artifacts(destination=None, source=None):
    base_url = pathlib.Path("%(prop:artifacts_private_url)s")
    dest_dir = (
        pathlib.Path(".") if destination is None else pathlib.Path(destination)
    )

    def _curl_cmd(filename):
        return 'curl -s -XGET -o "{out_path}" "{in_url}"'.format(
            out_path=dest_dir / filename, in_url=base_url / filename,
        )

    name_suffix = " ({})".format(source) if source is not None else ""

    # Get ISO checksum
    yield ShellCommand(
        "Retrieve ISO image checksum" + name_suffix,
        command=_curl_cmd("SHA256SUM"),
    )

    # Get ISO archive, with retry
    script = """
for ((i=1;i<={max_attempts};i++)); do
  echo "Attempt $i out of {max_attempts}"
  {curl_cmd} && exit
  sleep 2
done
echo "Could not retrieve ISO after {max_attempts} attempts" >&2
exit 1""".format(
        max_attempts=20, curl_cmd=_curl_cmd("metalk8s.iso"),
    )

    yield InlineBash(
        "Retrieve ISO image" + name_suffix, script=script, halt_on_failure=True
    )

    # Validate checksum
    yield ShellCommand(
        "Check ISO image with checksum" + name_suffix,
        command="sha256sum -c SHA256SUM",
        workdir=dest_dir,
    )


def prepare_bootstrap(iso="metalk8s.iso", mountpoint=DEFAULT_MOUNTPOINT):
    # Create mountpoint
    yield ShellCommand(
        "Create ISO mountpoint",
        command='sudo mkdir -p "{}"'.format(mountpoint),
        halt_on_failure=True,
    )

    # Mount ISO
    yield ShellCommand(
        "Mount ISO image",
        command='sudo mount -o loop "{}" "{}"'.format(iso, mountpoint),
        halt_on_failure=True,
    )

    # Create BootstrapConfiguration
    script = """
mkdir -p /etc/metalk8s
cat > /etc/metalk8s/bootstrap.yaml << END
apiVersion: metalk8s.scality.com/v1alpha2
kind: BootstrapConfiguration
networks:
  controlPlane: 10.100.0.0/16
  workloadPlane: 10.100.0.0/16
ca:
  minion: $(hostname)
apiServer:
  host: $(ip route get 10.100.0.0 | awk '/10.100.0.0/{{ print $6 }}')
archives:
  - "$(relpath '{iso}')"
END""".format(
        iso=iso
    )

    yield InlineBash(
        "Create bootstrap configuration file",
        script=script,
        sudo=True,
        halt_on_failure=True,
    )


def install_bootstrap(mountpoint=DEFAULT_MOUNTPOINT):
    return ShellCommand(
        "Start the bootstrap process",
        command='sudo bash "{}" --verbose'.format(mountpoint / "bootstrap.sh"),
        halt_on_failure=True,
    )


def provision_prometheus_volumes(mountpoint=DEFAULT_MOUNTPOINT):
    return RunScript(
        "Provision Prometheus and AlertManager storage",
        filepath="eve/create-volumes.sh",
        sudo=True,
        env={
            "PRODUCT_TXT": str(mountpoint / "product.txt"),
            "PRODUCT_MOUNT": str(mountpoint),
        },
        wrap_env=True,
        halt_on_failure=True,
    )


def run_tests(
    name,
    mode="default",
    filters=None,
    branch="%(prop:branch)s",
    iso_mountpoint=DEFAULT_MOUNTPOINT,
    ssh_config=None,
):
    command = NiceShell._and(
        'git checkout "$BRANCH" --quiet',
        NiceShell._fmt_args(
            "tox",
            "-e",
            "tests-local" if mode == "local" else "tests",
            ' -- -m "{}"'.format(filters) if filters else None,
        ),
    )

    env = {"BRANCH": branch, "ISO_MOUNTPOINT": iso_mountpoint}
    if mode != "local":
        env["SSH_CONFIG"] = ssh_config

    return NiceShell(name, command=command, env=env, halt_on_failure=True)


def run_cypress_tests():
    return ShellCommand(
        "Run Cypress tests",
        command="bash cypress.sh",
        workdir=BUILD_DIR / "ui",
        halt_on_failure=True,
        env={"IN_CI": "True"},
    )


def add_iso(iso="metalk8s.iso", mountpoint=DEFAULT_MOUNTPOINT):
    return ShellCommand(
        "Add ISO to cluster",
        command='sudo bash "{}" --archive "$(readlink -f "{}")"'.format(
            mountpoint / "iso-manager.sh", iso
        ),
        halt_on_failure=True,
    )


def run_downgrade(destination="%(prop:metalk8s_version_prev)s"):
    yield add_iso(iso="/tmp/metalk8s.iso")
    yield ShellCommand(
        "Run downgrade to previous version",
        command="sudo bash {} --destination-version {}".format(
            SRV_SCAL / "metalk8s-%(prop:metalk8s_version)s" / "downgrade.sh",
            destination,
        ),
        halt_on_failure=True,
    )


def run_upgrade(origin="%(prop:metalk8s_version_prev)s"):
    yield add_iso(mountpoint=SRV_SCAL / "metalk8s-{}".format(origin))
    yield ShellCommand(
        "Run upgrade from previous version",
        command="sudo bash {} --destination-version {}".format(
            SRV_SCAL / "metalk8s-{}".format(origin) / "upgrade.sh",
            "%(prop:metalk8s_version)s",
        ),
        halt_on_failure=True,
    )


def collect_sosreport(owner="eve", group="eve"):
    sosreport_cmd = (
        "sudo sosreport --all-logs "
        "-o metalk8s -kmetalk8s.podlogs=True "
        "-o containerd -kcontainerd.all=True -kcontainerd.logs=True "
        "--batch --tmp-dir /var/tmp"
    )

    return ShellCommand(
        "Collect logs using sosreport",
        command=" && ".join(
            [
                sosreport_cmd,
                "sudo chown {}:{} /var/tmp/sosreport*".format(owner, group),
            ]
        ),
    )


def install_kubectl():
    return NiceShell(
        "Install kubectl",
        command=(
            "yum install -y kubectl "
            "--disablerepo=* --enablerepo=metalk8s-kubernetes"
        ),
    )


def enable_ipip():
    return RunScript(
        "Enable IP-in-IP encapsulation for Calico",
        filepath="/home/centos/scripts/enable_ipip.sh",
    )


# Everything related to previous version {{{

PREV_REPO_DIR = pathlib.Path("metalk8s-prev")
PREV_WORKDIR = BUILD_DIR / PREV_REPO_DIR
PREV_MOUNTPOINT = SRV_SCAL / "metalk8s-%(prop:metalk8s_version_prev)s"


def git_pull_prev():
    return ShellCommand(
        "Clone development branch in previous version",
        command=(
            'git clone "%(prop:repository)s" '
            '--branch "development/%(prop:product_version_prev)s" {}'
        ).format(PREV_REPO_DIR),
    )


def set_previous_product_version_property():
    return SetPropertyFromCommand(
        "Set previous version to upgrade from and downgrade to",
        property_name="product_version_prev",
        command=NiceShell._and(
            "major=$(echo \"{current}\" | cut -d'.' -f1)",
            "minor=$(echo \"{current}\" | cut -d'.' -f2)",
            'echo "$major.$(( $minor - 1 ))"',
        ).format(current="%(prop:product_version)s"),
    )


# }}}

# }}}


if __name__ == "__main__":
    build_plan = build_project().dump()
    yaml_print.dump(build_plan, stream=sys.stdout)
