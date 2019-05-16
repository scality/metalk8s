from pytest_bdd import scenario, when


# Scenarios
@scenario('../features/bootstrap.feature', 'Re-run bootstrap')
def test_bootstrap(host):
    pass


# When
@when('we run bootstrap a second time')
def rerun_bootstrap(request, host):
    iso_root = request.config.getoption("--iso-root")
    cmd = str(iso_root / "bootstrap.sh")
    with host.sudo():
        res = host.run(cmd)
        assert res.rc == 0, res.stdout
