import pytest

from pytest_bdd import parsers
from pytest_bdd import scenario
from pytest_bdd import then

from utils.helper import Retry

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
def test_elasticsearch_external_values():
    pass


@then(parsers.parse("I can see the test annotation"))
def look_at_annotation(request):
    retry = Retry(10, msg='Cannot meet the assertion')
    while next(iter(retry)):
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
    retry = Retry(10, msg='Cannot meet the assertion')
    while next(iter(retry)):
        kube_object = request.get_kube_object()
        if kube_object.spec.replicas == count:
            break


@then(parsers.parse("I can't see the test annotation"))
def look_at_annotation_absence(request):
    retry = Retry(10, msg='Cannot meet the assertion')
    while next(iter(retry)):
        kube_object = request.get_kube_object()
        if isinstance(kube_object, V1beta1CronJob):
            metadata = kube_object.metadata
        else:
            metadata = kube_object.spec.template.metadata
        if metadata.annotations is None or \
                'metalk8s.io/test' not in metadata.annotations:
            break
