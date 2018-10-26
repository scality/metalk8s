import pytest

from pytest_bdd import parsers
from pytest_bdd import scenario
from pytest_bdd import then

from utils.helper import retry

from kubernetes.client import V1beta1CronJob


@pytest.fixture
def pytestbdd_strict_gherkin():
    return False


@scenario('features/external_values.feature',
          'Change parameters of Nginx-ingress')
def test_nginx_ingress_external_values():
    pass


@scenario('features/external_values.feature',
          'Change parameters of Elasticsearch')
def test_elasticsearch_external_values(inventory_obj):
    node = inventory_obj.get_groups_dict()['kube-master'][0]
    if 'elasticsearch_external_values' in inventory_obj._hostvars[node]:
        pytest.skip("Variable 'elasticsearch_external_values' already set")


@then(parsers.parse("I can see the test annotation"))
def look_at_annotation(request):
    try_ = retry(10, msg='Cannot meet the assertion')
    while next(try_):
        kube_object = request.get_kube_object()
        if isinstance(kube_object, V1beta1CronJob):
            metadata = kube_object.metadata
        else:
            metadata = kube_object.spec.template.metadata
        if metadata.annotations is not None and \
                metadata.annotations['metalk8s.io/test'] == 'true':
            break


@then(parsers.parse("I can see the number of replicas '{count:d}'"))
def look_at_replicas_number(request, count):
    try_ = retry(10, msg='Cannot meet the assertion')
    while next(try_):
        kube_object = request.get_kube_object()
        if kube_object.spec.replicas == count:
            break


@then(parsers.parse("I can't see the test annotation"))
def look_at_annotation_absence(request):
    try_ = retry(10, msg='Cannot meet the assertion')
    while next(try_):
        kube_object = request.get_kube_object()
        if isinstance(kube_object, V1beta1CronJob):
            metadata = kube_object.metadata
        else:
            metadata = kube_object.spec.template.metadata
        if metadata.annotations is None or \
                'metalk8s.io/test' not in metadata.annotations:
            break
