import json

from pytest_bdd import scenario, when, then, parsers

from tests import utils

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
@then(parsers.parse("we have at most {most_unt} backups on each node"))
def check_backup_archive_count(host, version, ssh_config, most_count):
    command = [
        "salt",
        "--static",
        "--out=json",
        "'*'",
        "cmd.run",
        "ls -1 /var/lib/metalk8s/backups/*.tar.gz | wc -l",
        f"saltenv=metalk8s-{version}",
    ]

    backup_counts = json.loads(utils.run_salt_command(host, command, ssh_config))

    for name, count in backup_counts.items():
        assert int(count) <= int(most_count), (
            f"Expected at most {most_count} backup archives on "
            f"node {name}, got {count}"
        )
