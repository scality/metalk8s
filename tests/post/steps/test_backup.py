import yaml

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
@then(parsers.parse("we have {count} backups on each node"))
def check_backup_archive_count(host, version, ssh_config, count):
    # using yaml becasue json output is not always correctly formatted
    get_master_nodes_command = [
        "salt-run",
        "--out yaml",
        "salt.cmd",
        "metalk8s.minions_by_role",
        "master",
        "with_pillar=True",
    ]
    master_nodes = yaml.load(
        utils.run_salt_command(host, get_master_nodes_command, ssh_config).stdout,
        Loader=yaml.Loader,
    )
    assert len(master_nodes) > 0, "No master node found"

    if len(master_nodes) == 1:
        master_nodes = master_nodes[0]
    else:
        master_nodes = f"-L {','.join(master_nodes)}"

    command = [
        "salt",
        "--out yaml",
        master_nodes,
        "cmd.run_all",
        '"find /var/lib/metalk8s/backups -name "*.tar.gz" | wc -l"',
    ]
    backup_counts = yaml.load(
        utils.run_salt_command(host, command, ssh_config).stdout, Loader=yaml.Loader
    )

    for name, ret in backup_counts.items():
        assert ret["retcode"] == 0, ret["stderr"]
        assert int(ret["stdout"]) == int(count), (
            f"Expected {count} backup archives on " f'node {name}, got {ret["stdout"]}'
        )
