import collections
import os
import logging
import subprocess
import time

import pytest
import requests
import yaml

from pytest_bdd import given
from pytest_bdd import parsers
from pytest_bdd import scenarios
from pytest_bdd import then
from pytest_bdd import when

from utils.helper import run_make_shell

@pytest.fixture
def pytestbdd_strict_gherkin():
   return False


scenarios('features/storage.feature')


def get_kubernetes_pv(kubeconfig):
    pv_list_process = run_make_shell(
        'kubectl get pv --export -o yaml',
        env={'KUBECONFIG': kubeconfig},
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    kubectl_output = pv_list_process.stdout.read()
    pv_list = yaml.load(kubectl_output)
    if pv_list is None:
        logging.error("kubectl stdout: {}\n stderr: {}".format(
            kubectl_output,
            pv_list_process.stderr.read()
        ))
    return pv_list['items']


def count_pv(pv_list):
    pv_count = collections.Counter()
    for pv in pv_list:
        pv_count[pv['status']['phase']] += 1
    return pv_count


state_storage_string = "{quantity} PersistentVolume should be in '{state}' state"


@given(parsers.parse(state_storage_string))
def check_quantity_storage_in_state(quantity, state, kubeconfig):
    assert quantity in ['No', 'Some']
    nb = ['No', 'Some'].index(quantity)
    pv_count = count_pv(get_kubernetes_pv(kubeconfig))
    assert bool(nb) == bool(pv_count[state]), \
        'PV count {} for {} in {}'.format(pv_count, quantity, state)


@then(parsers.parse(state_storage_string))
def assert_quantity_storage_in_state(quantity, state, kubeconfig):
    assert quantity in ['No', 'Some']
    nb = ['No', 'Some'].index(quantity)
    pv_count = count_pv(get_kubernetes_pv(kubeconfig))
    assert bool(nb) == bool(pv_count[state]), \
        'PV count {} for {} in {}'.format(pv_count, quantity, state)


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
