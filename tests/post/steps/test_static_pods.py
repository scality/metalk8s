import pathlib
import string

import pytest
from pytest_bdd import given, scenario, then, when

from tests import kube_utils
from tests import utils

# Constants {{{

MANIFESTS_PATH = pathlib.Path("/etc/kubernetes/manifests/")
TEMPLATES_PATH = pathlib.Path("/srv/scality/_templates/")
SOURCE_TEMPLATE = (
    pathlib.Path(__file__) / ".." / "files" / "static-pod.yaml.tpl"
).resolve()
DEFAULT_POD_NAME = "sample-static-pod"

# }}}
# Fixtures {{{


@pytest.fixture(scope="function")
def transient_files(host):
    """A fixture to store a list of filenames to remove after a test."""
    filenames = []

    yield filenames

    with host.sudo():
        for file in filenames:
            cmd = host.run("rm -f %s", file)
            assert cmd.rc == 0, "Failed to remove file '{}': {}".format(
                file, cmd.stderr
            )


# }}}


@scenario(
    "../features/static_pods.feature",
    "Static Pods restart on configuration change",
)
def test_static_pods_restart(host, transient_files):
    pass


@given("I have set up a static pod", target_fixture="static_pod_id")
def set_up_static_pod(
    host, hostname, k8s_client, utils_image, transient_files
):
    manifest_path = str(MANIFESTS_PATH / "{}.yaml".format(DEFAULT_POD_NAME))

    with host.sudo():
        if host.file(manifest_path).exists:
            pytest.fail(
                "Cannot set up static Pod with manifest at path '{}': "
                "already exists".format(manifest_path)
            )

    # A sample config file for the static Pod
    config_path = "/tmp/{}.conf".format(DEFAULT_POD_NAME)
    write_config = utils.write_string(host, config_path, '{"hello": "world"}')
    assert write_config.rc == 0, (
        "Failed to write static Pod config file at '{}': {}"
    ).format(config_path, write_config.stderr)

    transient_files.append(config_path)

    # The manifest template to use with Salt
    manifest_template = SOURCE_TEMPLATE.read_text(encoding="utf-8")
    manifest = string.Template(manifest_template).substitute(
        name=DEFAULT_POD_NAME,
        image=utils_image,
        config_path=config_path,
    )

    with host.sudo():
        host.run_test("mkdir -p %s", str(TEMPLATES_PATH))

        template_path = str(
            TEMPLATES_PATH / "{}.yaml.j2".format(DEFAULT_POD_NAME)
        )
        write_template = utils.write_string(host, template_path, manifest)
        assert write_template.rc == 0, (
            "Failed to create static Pod manifest template '{}': {}"
        ).format(template_path, write_template.stderr)

    transient_files.append(template_path)

    # Use Salt to generate the effective static Pod manifest
    _manage_static_pod(host, manifest_path, template_path, config_path)

    assert host.file(manifest_path).exists, (
        "Something went wrong: "
        "static Pod manifest could not be found after set-up"
    )

    # We want to remove the manifest before the config file, since kubelet
    # may try to mount it and, when not found, create a directory (bug).
    # See: https://github.com/kubernetes/kubernetes/issues/65825
    transient_files.insert(0, manifest_path)

    fullname = "{}-{}".format(DEFAULT_POD_NAME, hostname)

    utils.retry(
        kube_utils.wait_for_pod(k8s_client, fullname),
        times=10,
        wait=5,
        name="wait for Pod '{}'".format(fullname),
    )

    pod = k8s_client.read_namespaced_pod(name=fullname, namespace="default")
    return pod.metadata.uid


@when("I edit the configuration of the static pod")
def edit_static_pod_config(host):
    config_path = "/tmp/{}.conf".format(DEFAULT_POD_NAME)

    with host.sudo():
        edit_config = utils.write_string(
            host, config_path, '{"goodbye": "world"}'
        )
        assert edit_config.rc == 0, (
            "Failed to edit config file at '{}': {}"
        ).format(config_path, edit_config.stderr)


@when("I use Salt to manage the static pod")
def manage_static_pod(host):
    manifest_path = str(MANIFESTS_PATH / "{}.yaml".format(DEFAULT_POD_NAME))
    template_path = str(TEMPLATES_PATH / "{}.yaml.j2".format(DEFAULT_POD_NAME))
    config_path = "/tmp/{}.conf".format(DEFAULT_POD_NAME)
    _manage_static_pod(host, manifest_path, template_path, config_path)


@then("the static pod was changed")
def check_static_pod_changed(host, hostname, k8s_client, static_pod_id):
    fullname = "{}-{}".format(DEFAULT_POD_NAME, hostname)
    utils.retry(
        kube_utils.wait_for_pod(k8s_client, fullname),
        times=10,
        wait=5,
        name="wait for Pod '{}'".format(fullname),
    )
    pod = k8s_client.read_namespaced_pod(name=fullname, namespace="default")

    assert pod.metadata.uid != static_pod_id


# Helpers {{{


def _manage_static_pod(host, manifest_path, template_path, config_path):
    with host.sudo():
        manage_static_pod = host.run(
            "salt-call state.single metalk8s.static_pod_managed "
            'name=%s source=%s config_files=["%s"]',
            manifest_path,
            template_path,
            config_path,
        )
        assert manage_static_pod.rc == 0, (
            "Failed to manage static Pod with Salt: {}"
        ).format(manage_static_pod.stderr)


# }}}
