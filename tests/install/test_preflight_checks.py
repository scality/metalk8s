import os
import pytest
import re

from pytest_bdd import given
from pytest_bdd import parsers
from pytest_bdd import scenario
from pytest_bdd import then
from pytest_bdd import when

from utils.ansible import AnsibleHelper
from utils.ansible import CallbackTestMetalK8s


@pytest.fixture
def pytestbdd_strict_gherkin():
    return False


@scenario('features/preflight_checks.feature',
          'Run preflight checks with invalid FQDN')
def test_preflight_checks_with_invalid_fqdn():
    pass


@scenario('features/preflight_checks.feature',
          'Run preflight checks with capital letter')
def test_preflight_checks_with_capital_letter():
    pass


@given(parsers.parse('A list of kube masters:\n{kube_master}'))
def kube_masters(kube_master):
    '''Return a list of kube-masters'''
    return kube_master


@given(parsers.parse('A list of kube nodes:\n{kube_node}'))
def kube_nodes(kube_node):
    '''Return a list of kube-nodes'''
    return kube_node


@given(parsers.parse('A list of etcd nodes:\n{etcd_node}'))
def etcd_nodes(etcd_node):
    '''Return a list of etc-nodes'''
    return etcd_node


@then('I generate an inventory with these lists')
@pytest.fixture
def inventory_with_lists(archive_dir,
                         kube_masters,
                         kube_nodes,
                         etcd_nodes):
    '''Return a path of a fake inventory

    Populate this file with kube-masters, kube-nodes and etcd-nodes provided
    in the feature file and the sorted list of all hosts
    '''

    inventory_path = "{path}/inventory_with_lists".format(
        path=archive_dir)
    full_host_list = kube_nodes.splitlines() + kube_masters.splitlines() \
        + etcd_nodes.splitlines()
    full_host_list = sorted(set(full_host_list))
    with open(inventory_path, "w") as inventory:
        inventory.write('\n'.join(full_host_list))
        inventory.write("\n[kube-master]\n{kube_masters}".format(
            kube_masters=kube_masters))
        inventory.write("\n[kube-node]\n{kube_nodes}".format(
            kube_nodes=kube_nodes))
        inventory.write("\n[etcd]\n{etcd_nodes}".format(
            etcd_nodes=etcd_nodes))
        inventory.write(
            "\n[k8s-cluster:children]\n"
            "kube-master\n"
            "kube-node\n".format(
                etcd_nodes=etcd_nodes))
    os.environ['ANSIBLE_INVENTORY'] = inventory_path
    return inventory_path


@when('I run the preflight checks')
@pytest.fixture
def run_preflight_checks(inventory_with_lists):
    '''Run the preflight checks'''

    # Create the ansible object with the inventory
    ansible_helper = AnsibleHelper(sources=inventory_with_lists)
    # Set the call back
    metalk8s_callback = CallbackTestMetalK8s(ansible_helper)
    ansible_helper.stdout_callback = metalk8s_callback

    play_source = dict(
        name='Validate inventory',
        hosts=['localhost'],
        gather_facts=False,
        roles=[
            dict(role='preflight_checks'),
        ]
    )

    # Run the preflight checks
    ansible_helper.run(play_source)

    return ansible_helper


@then(parsers.parse('The preflight checks should fail with '
                    'invalid fqdn:\n{bad_hostname}'))
def preflight_checks_invalid_fqdn(bad_hostname,
                                  inventory_with_lists,
                                  run_preflight_checks):
    '''Check the preflight checks errors'''

    err_fqdn = r'^The hostname (?P<host>.+) does not match a valid FQDN\..*'

    list_bad_hostname = set(bad_hostname.splitlines())
    errors = run_preflight_checks.results[0]['result']['errors']
    regexp = re.compile(err_fqdn)
    error_seen = set()
    for error in errors:
        # Build the regexp that must match
        result = regexp.match(error)
        if result:
            error_seen.add(result.group('host'))

    assert error_seen == list_bad_hostname, \
        "These bad hostnames have not matched: {0}".format(
            " ".join(list_bad_hostname))


@then(parsers.parse('The preflight checks should fail with capital '
                    'letter:\n{bad_hostname}'))
def preflight_checks_capital_letter(bad_hostname,
                                    inventory_with_lists,
                                    run_preflight_checks):
    '''Check the preflight checks errors'''

    err_uppercase = r'The hostname (?P<host>.+) contains capital letter\. ' \
        r'Please rename it to (?P<host_lower>.+) in your ' \
        r'inventory (?P<inventory>.+)\.'

    list_bad_hostname = set(bad_hostname.splitlines())
    errors = run_preflight_checks.results[0]['result']['errors']
    regexp = re.compile(err_uppercase)
    error_seen = set()
    for error in errors:
        # Build the regexp that must match
        result = regexp.match(error)
        if result:
            error_seen.add(result.group('host'))

    assert error_seen == list_bad_hostname, \
        "These bad hostnames have not matched: {0}".format(
            " ".join(list_bad_hostname))
