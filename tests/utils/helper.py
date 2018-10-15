import logging
import os
import subprocess
import time

from ansible.inventory.manager import InventoryManager
from ansible.parsing.dataloader import DataLoader


def run_make_shell(args=None, basedir=None, tmpdir=None, **kwargs):
    make_args = []
    if basedir:
        make_args.extend(('-C', basedir))
    if tmpdir:
        make_args.append('SHELL_ENV={}'.format(tmpdir))
    if args:
        command = args
    else:
        command = 'true'
    make_args.append('C="{}"'.format(command))
    full_command = 'make shell {args}'.format(args=' '.join(make_args))
    logging.warning("Running: {}".format(full_command))
    make_process = subprocess.Popen(full_command, shell=True, **kwargs)
    make_process.wait()

    return make_process


def run_ansible_playbook(playbook, env=None, basedir=None, tmpdir=None):
    env_vars = dict(os.environ)
    env_vars.setdefault('ANSIBLE_FORCE_COLOR', "true")
    if env:
        env_vars.update(env)
    command = "ansible-playbook playbooks/{}".format(playbook)
    return run_make_shell(
        args=command,
        env=env_vars,
        basedir=basedir,
        tmpdir=tmpdir
    )


class Inventory(object):
    def __init__(self, filename):
        self._loader = DataLoader()
        self._inventory = InventoryManager(
            loader=self._loader, sources=filename)

    def __getattr__(self, key):
        return getattr(self._inventory, key)


class RetryCountExceededError(StopIteration):
    "Exception to finish retry"


def retry(count, wait=2, msg=None):
    for _ in range(count):
        yield True
        time.sleep(wait)
    raise RetryCountExceededError(msg)


def create_version_archive(version, tmpdir):
    git_top = subprocess.check_output(('git', 'rev-parse', '--show-toplevel'))
    git_top = git_top.strip()
    git_command = ('git', 'archive', '--prefix={}/'.format(version), version)
    git = subprocess.Popen(git_command, stdout=subprocess.PIPE, cwd=git_top)
    subprocess.check_call(('tar', '-C', str(tmpdir), '-x'), stdin=git.stdout)
    git.wait()
    assert git.returncode == 0
    return str(tmpdir.join(version))
