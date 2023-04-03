"""Module to manage Metalk8s backups."""

__virtualname__ = "metalk8s_backups"


def __virtual__():
    return __virtualname__


def get_backups_to_delete(backup_folder, retention_count):
    """Return a list of backups to delete."""
    backups = []
    ret = __salt__["cmd.run"](f'ls -t "{backup_folder}"/*.tar.gz')
    if ret["retcode"] == 0:
        backups = ret["stdout"].split("\n")
    return " ".join(backups[int(retention_count) :])
