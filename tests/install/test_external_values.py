import pytest

from pytest_bdd import parsers
from pytest_bdd import scenario
from pytest_bdd import then

from utils.helper import retry


@pytest.fixture
def pytestbdd_strict_gherkin():
    return False


@scenario('features/external_values.feature',
          'Change parameters of Nginx-ingress')
def test_external_values():
    pass


@then(parsers.parse("I can see the test label"))
def look_at_label(request):
    try_ = retry(10, 'Cannot meet the assertion')
    while next(try_):
        kube_object = request.get_kube_object()
        if kube_object.spec.template.metadata.annotations[
                'metalk8s.io/test'] == 'true':
            break


@then(parsers.parse("I can't see the test label"))
def look_at_label_absence(request):
    try_ = retry(10, 'Cannot meet the assertion')
    while next(try_):
        kube_object = request.get_kube_object()
        if 'metalk8s.io/test' not in \
                kube_object.spec.template.metadata.annotations:
            break
