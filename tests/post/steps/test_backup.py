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
@then(parsers.parse("we have {count} backups on each node"), converters=dict(count=int))
def check_backup_archive_count(host, ssh_config, k8s_client, count):
    master_nodes = [
        node.metadata.name
        for node in k8s_client.resources.get(api_version="v1", kind="Node")
        .get(label_selector=f"node-role.kubernetes.io/master")
        .items
    ]
    assert len(master_nodes) > 0, "No master node found"

    command = [
        "salt",
        "--static",
        "--out json",
        "-L",
        f"{','.join(master_nodes)}",
        "file.find",
        "/var/lib/metalk8s/backups",
        "type=f",
        "name=*.tar.gz",
        "maxdepth=1",
    ]
    ret = json.loads(utils.run_salt_command(host, command, ssh_config).stdout)

    for name, backups in ret.items():
        assert len(backups) == count, (
            f"Expected {count} backup archives on "
            f"node {name}, got {len(backups)}: {backups}"
        )
