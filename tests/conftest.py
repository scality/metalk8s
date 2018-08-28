import os
import os.path
import logging
import subprocess

import pytest

from pytest_bdd import given
from pytest_bdd import parsers
from pytest_bdd import then
from pytest_bdd import when

from utils.helper import run_ansible_playbook
from utils.helper import run_make_shell


@pytest.fixture(scope="session")
def inventory():
    inventory_file = os.environ.get('ANSIBLE_INVENTORY')
    if not os.path.exists(inventory_file):
        pytest.fail(
            "The path specified by ANSIBLE_INVENTORY environment variable "
            "does not exist: '{0}'".format(inventory_file)
        )
    return inventory_file


@pytest.fixture(scope="session")
def kubeconfig(inventory):
    inventory_dir = os.path.dirname(inventory)
    kubeconfig = os.environ.get(
        'KUBECONFIG',
        '{}/artifacts/admin.conf'.format(inventory_dir)
    )
    if not os.path.exists(kubeconfig):
        pytest.fail(
            "The path in KUBECONFIG environment variable "
            "does not exist: '{0}'".format(kubeconfig)
        )

    return kubeconfig


@given('A complete inventory')
def inventory_check(inventory):
    return inventory


@given('an installed platform')
def complete_installation(inventory):
    pass


@when(parsers.parse("I launch ansible with the '{playbook}' playbook"))
def ansible_playbook_step(request, inventory, playbook):
    ansible_process = run_ansible_playbook(playbook)
    request.ansible_process = ansible_process
    return ansible_process


@then('Playbook should complete without error')
def ansible_no_error(request):
    assert request.ansible_process.returncode == 0


@when(parsers.parse("I run 'kubectl {kubectl_args}' in a supported shell"))
def run_kubectl_command(request, kubeconfig, kubectl_args):
    kubectl_command = "kubectl {}".format(kubectl_args)
    kubectl_run = run_make_shell(
        kubectl_command,
        env={'KUBECONFIG': kubeconfig},
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE
    )
    if kubectl_run.returncode != 0:
        logging.error("kubectl stdout: {}\n stderr: {}".format(
            kubectl_run.stdout.read(),
            kubectl_run.stderr.read()
        ))
    request.kubectl_result = kubectl_run
    return kubectl_run
