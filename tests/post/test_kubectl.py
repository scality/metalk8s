import pytest

from pytest_bdd import scenarios
from pytest_bdd import then


scenarios('features/kubectl.feature')


@then("I should get a good list of nodes")
def get_node_list(request, inventory_obj):
    if request.kubectl_result.returncode != 0:
        pytest.fail('Error running kubectl command')
    lines = request.kubectl_result.stdout.read().splitlines()
    nodes_nb = len(set(inventory_obj.get_groups_dict()['kube-master'] +
                       inventory_obj.get_groups_dict()['kube-node']))
    assert nodes_nb == len(lines) - 1  # Start with column name line
