import pytest
import requests

from pytest_bdd import parsers
from pytest_bdd import scenarios
from pytest_bdd import then
from pytest_bdd import when


@pytest.fixture
def pytestbdd_strict_gherkin():
    return False


scenarios('features/elasticsearch.feature')


@when(parsers.parse('I request the elasticsearch cluster health status'))
def get_elasticsearch_cluster_status(request, kubectl_proxy, inventory_obj):
    es_answer = requests.get(
        "http://localhost:8001/api/v1/namespaces/kube-ops"
        "/services/elasticsearch-client:9200/proxy/_cluster/health",
    )
    es_answer.raise_for_status()
    data = es_answer.json()
    assert 'status' in data

    request.data = data


@then(parsers.parse('I should find the cluster with a {color} status'))
def look_at_cluster_status(request, color):
    assert request.data['status'] == color
