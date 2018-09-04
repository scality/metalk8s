import pytest

from pytest_bdd import scenarios
from pytest_bdd import then


scenarios('features/kubectl.feature')


@then("I should get a good list of nodes")
def get_node_list(request, inventory_obj):
    if request.kubectl_result.returncode != 0:
        pytest.fail('Error running kubectl command')
    lines = request.kubectl_result.stdout.read().splitlines()
    # Parsing stdout of a make shell C='kubectl ...' is a bit tricky:
    # First there is chance that virtualenv is not ready so that
    # stdout get poluted by "creating virtualenv...", "dowloading kubectl"
    # => Start parsing after the header line starting with 'NAME' in this case
    for n, line in enumerate(lines, start=1):
        if line.startswith('NAME'.encode('utf-8')):
            break
    else:
        raise AssertionError("Kubectl header line cannot be found")

    nodes_nb = len(set(inventory_obj.get_groups_dict()['kube-master'] +
                       inventory_obj.get_groups_dict()['kube-node']))
    assert nodes_nb == len(lines) - n  # Start after Header line
