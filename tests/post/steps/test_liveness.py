import pytest
from pytest_bdd import scenario, given, when, then, parsers

# Scenarios
@scenario('../features/pods_alive.feature', 'get pods')
def test_pods(host):
    pass

# Given

@given('The bootstrap phase is executed')
def run_bootstrap(host):
    pass

# When

@when(parsers.parse("I run '{cmd}'"))
def run_command(request, host, cmd):
    cmd_res = host.run(command=cmd)
    request.cmd_result = cmd_res.stdout.strip()

# Then

@then('Pods list should not be empty')
def list_pods(request):
    assert len(request.cmd_result)

