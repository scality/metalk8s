from pytest_bdd import scenario


# Scenarios
@scenario('../features/bootstrap.feature', 'Re-run bootstrap')
def test_bootstrap(host):
    pass
