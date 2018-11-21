import os

import pytest

from pytest_bdd import given
from pytest_bdd import scenarios
from pytest_bdd import then
from pytest_bdd import when

from utils.helper import run_ansible_playbook
from utils.helper import run_make_shell


@pytest.fixture
def pytestbdd_strict_gherkin():
    return False


scenarios('features/disk_replacement.feature')


@given('I work on first server')
def server(inventory_obj):
    return inventory_obj.get_groups_dict()['kube-node'][0]


@given('the first drive has to be changed')
def disk(inventory_obj, server):
    return inventory_obj._hostvars[server][
        'metalk8s_lvm_drives_vg_metalk8s'][0]


@when('I drain first server')
def drain_node(request, kubeconfig, server):
    print(server)
    env_vars = os.environ.copy()
    env_vars.update({'KUBECONFIG': kubeconfig})
    kubectl_command = "kubectl cordon {}".format(server)
    kubectl_run = run_make_shell(
        kubectl_command,
        env=env_vars
    )
    if kubectl_run.returncode != 0:
        pytest.fail('Impossible to cordon node')


@when(
    "I launch the playbook 'unmount-drive.yml'"
)
def unmount_drive(request, server, disk):
    ansible_process = run_ansible_playbook(
        'unmount_drive.yml',
        external_vars={
            'selected_node': server,
            'disk_to_replace': disk,
            'ask_user_confirmation': 'False'
        }
    )
    request.ansible_process = ansible_process
    return ansible_process


@when("I virtually change the disk of the server")
def reset_disk(request, kubeconfig, server, disk):
    env_vars = os.environ.copy()
    env_vars.update({'KUBECONFIG': kubeconfig})
    ansible_command = "ansible {0} -a 'pvremove -y {1}'".format(
        server,
        disk
    )

    ansible_run = run_make_shell(
        ansible_command,
        env=env_vars
    )
    if ansible_run.returncode != 0:
        pytest.fail('Impossible to reset disk')


@then("I uncordon first server")
def uncordon_node(request, kubeconfig, server):
    env_vars = os.environ.copy()
    env_vars.update({'KUBECONFIG': kubeconfig})
    kubectl_command = "kubectl uncordon {} ".format(server)
    kubectl_run = run_make_shell(
        kubectl_command,
        env=env_vars
    )
    if kubectl_run.returncode != 0:
        pytest.fail('Impossible to uncordon node')
