import functools
import logging
import os
import subprocess
import time


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


def run_ansible_playbook(playbook, env=None, tags=None, skip_tags=None,
                         external_vars=None, basedir=None, tmpdir=None):
    env_vars = dict(os.environ)
    env_vars.setdefault('ANSIBLE_FORCE_COLOR', "true")
    if env:
        env_vars.update(env)
    command = "ansible-playbook playbooks/{}".format(playbook)
    if external_vars:
        for key, value in external_vars.items():
            command += ' -e {}={}'.format(key, value)
    if tags:
        command += ' -t {}'.format(tags)
    if skip_tags:
        command += ' --skip-tags {}'.format(skip_tags)
    return run_make_shell(
        args=command,
        env=env_vars,
        basedir=basedir,
        tmpdir=tmpdir
    )


class RetryCountExceededError(StopIteration):
    "Exception to finish retry"


class Retry(object):

    def __init__(self, count, wait=2, msg=None):
        self.count = count
        self.wait = wait
        self.msg = msg

    def __iter__(self):
        for _ in range(self.count):
            yield True
            time.sleep(self.wait)
        return self.msg

    def __call__(self, func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            for _ in iter(self):
                try:
                    return func(*args, **kwargs)
                except Exception as exc:
                    logging.exception(str(exc))
            else:
                return func(*args, **kwargs)
        return wrapper


def create_version_archive(version, tmpdir):
    git_top = subprocess.check_output(('git', 'rev-parse', '--show-toplevel'))
    git_top = git_top.strip()
    git_command = ('git', 'archive', '--prefix={}/'.format(version), version)
    git = subprocess.Popen(git_command, stdout=subprocess.PIPE, cwd=git_top)
    subprocess.check_call(('tar', '-C', str(tmpdir), '-x'), stdin=git.stdout)
    git.wait()
    assert git.returncode == 0
    return str(tmpdir.join(version))
