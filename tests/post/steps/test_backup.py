from pytest_bdd import scenario, when, then, parsers

# Scenarios
@scenario("../features/backup.feature", "Backup multiple times")
def test_backup(host):
    pass


# When
@when(parsers.parse("we run the backup script {times} times"))
def run_backup(request, host, times):
    iso_root = request.config.getoption("--iso-root")

    for _ in range(int(times)):
        with host.sudo():
            res = host.run("%s/backup.sh", str(iso_root))
            assert res.rc == 0, res.stdout


# Then
@then(parsers.parse("we should have {count} backup archives"))
def check_backup_archive_count(request, host, count):
    iso_root = request.config.getoption("--iso-root")

    with host.sudo():
        res = host.run("ls -1 %s/*.tar.gz | wc -l", str(iso_root))
        assert res.rc == 0, res.stdout
        assert res.stdout.strip() == count
