import collections
import logging
import os
import subprocess
import time

import yaml

import pytest

from pytest_bdd import given
from pytest_bdd import parsers
from pytest_bdd import scenarios
from pytest_bdd import then
from pytest_bdd import when

from utils.helper import run_make_shell
from utils.helper import get_kube_resources


@pytest.fixture
def pytestbdd_strict_gherkin():
    return False


scenarios('features/storage.feature')


def get_kubernetes_pv(kubeconfig):
    return get_kube_resources(kubeconfig, 'PersistentVolume').items


def count_pv(pv_list):
    pv_count = collections.Counter()
    for pv in pv_list:
        pv_count[pv.status.phase] += 1
    return pv_count


def check_quantity_storage_in_state(quantity, state, kubeconfig):
    assert quantity in ['No', 'Some']
    nb = ['No', 'Some'].index(quantity)
    pv_count = count_pv(get_kubernetes_pv(kubeconfig))
    assert bool(nb) == bool(pv_count[state]), \
        'PV count {} for {} in {}'.format(pv_count, quantity, state)


state_storage_str = "{quantity} PersistentVolume should be in '{state}' state"


@given(parsers.parse(state_storage_str))
def given_quantity_storage_in_state(quantity, state, kubeconfig):
    check_quantity_storage_in_state(quantity, state, kubeconfig)


@then(parsers.parse(state_storage_str))
def then_quantity_storage_in_state(quantity, state, kubeconfig):
    check_quantity_storage_in_state(quantity, state, kubeconfig)


@when('I clean the pvc')
def clean_pvc(kubeconfig):
    run_make_shell(
        'kubectl delete pod test-pv; kubectl delete pvc testclaim',
        env={'KUBECONFIG': kubeconfig}
    )


@when('I launch test storage pod')
def lauch_test_storage_pod(kubeconfig):
    pod_yaml_path = os.path.join(os.path.dirname(__file__),
                                 'files/storage_pod_test.yml')
    run_make_shell(
        'kubectl apply -f {}'.format(pod_yaml_path),
        env={'KUBECONFIG': kubeconfig}
    )


@then("The result of test storage pod should be 'success'")
def storage_pod_test_result(kubeconfig):
    count = 5
    while count:
        test_pv_process = run_make_shell(
            'kubectl get pods test-pv -o yaml',
            env={'KUBECONFIG': kubeconfig},
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )
        kubectl_output = test_pv_process.stdout.read()
        test_pv_info = yaml.load(kubectl_output)
        if test_pv_info is None:
            logging.error("kubectl stdout: {}\n stderr: {}".format(
                kubectl_output,
                test_pv_process.stderr.read()
            ))
        if test_pv_info['status']['phase'] in ['Succeeded', 'Failed']:
            break
        count -= 1
        time.sleep(1)
    assert test_pv_info['status']['phase'] == 'Succeeded'
