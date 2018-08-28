import pytest

from pytest_bdd import scenario
from pytest_bdd import scenarios
from pytest_bdd import when

from utils.helper import run_make_shell


@pytest.fixture
def pytestbdd_strict_gherkin():
    return False


@scenario('features/installation.feature', 'Run install and re-install')
def test_installation():
    pass


# All other scenarios will be discovered and bound
scenarios('features')


@when("I run 'make shell'")
def make_shells_step():
    make_process = run_make_shell()
    assert make_process.returncode == 0
