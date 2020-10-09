"""Custom states for MetalK8s."""

import time
import re


__virtualname__ = "metalk8s"


def __virtual__():
    return __virtualname__


def static_pod_managed(name,
                       source,
                       config_files=None,
                       config_files_opt=None,
                       context=None,
                       **kwargs):
    """Simple helper to edit a static Pod manifest if configuration changes.

    Expects the template to use:
    - `config_digest` variable and store it in the `metadata.annotations`
      section, with the key `metalk8s.scality.com/config-digest`.
    - `metalk8s_version` variabble and store it in the `metadata.labels`
      section, with the key `metalk8s.scality.com/version`.

    name:
        Path to the static pod manifest.

    source:
        Source file used to render the manifest.

    config_files:
        List of file to use to generate a digest store in `config_digest` in
        the source template.

    config_files_opt:
        Same as config_files but these files are optional (ignored if the file
        does not exists).

    context:
        Context to use to render the source template.

    kwargs:
        Any arguments supported by `file.managed` are supported.
    """
    if not config_files:
        config_files = []

    for config_file in config_files_opt or []:
        if __salt__["file.file_exists"](config_file):
            config_files.append(config_file)

    config_file_digests = [
        __salt__["hashutil.digest_file"](config_file, checksum="sha256")
        for config_file in config_files
    ]
    config_digest = __salt__["hashutil.md5_digest"](
        "-".join(config_file_digests)
    )

    match = re.search(r'metalk8s-(?P<version>.+)$', __env__)
    metalk8s_version = match.group('version') if match else "unknown"

    return __states__["file.managed"](
        name,
        source,
        template=kwargs.pop("template", "jinja"),
        user=kwargs.pop("user", "root"),
        group=kwargs.pop("group", "root"),
        mode=kwargs.pop("mode", "0600"),
        makedirs=kwargs.pop("makedirs", False),
        backup=kwargs.pop("backup", False),
        context=dict(
            context or {},
            config_digest=config_digest, metalk8s_version=metalk8s_version
        ),
        **kwargs
    )


def module_run(name, attemps=1, sleep_time=10, **kwargs):
    """Classic module.run with a retry logic as it's buggy in salt version
    https://github.com/saltstack/salt/issues/44639
    """
    retry = attemps
    ret = {'name': name,
           'changes': {},
           'result': False,
           'comment': ''}
    while retry > 0 and not ret['result']:
        try:
            ret = __states__["module.run"](
                name,
                **kwargs
            )
        except Exception as exc:  # pylint: disable=broad-except
            ret['comment'] = str(exc)

        retry = retry - 1
        if retry and not ret['result']:
            time.sleep(sleep_time)

    return ret


def saltutil_cmd(name, **kwargs):
    """Simple `saltutil.cmd` state as `salt.function` do not support roster and
    raw ssh, https://github.com/saltstack/salt/issues/58662"""
    ret = {
        'name': name,
        'changes': {},
        'result': True,
        'comment': ''
    }

    try:
        cmd_ret = __salt__['saltutil.cmd'](fun=name, **kwargs)
    except Exception as exc:  # pylint: disable=broad-except
        ret['result'] = False
        ret['comment'] = str(exc)
        return ret

    try:
        ret['__jid__'] = cmd_ret[next(iter(cmd_ret))]['jid']
    except (StopIteration, KeyError):
        pass

    fail = set()

    for minion, mdata in cmd_ret.items():
        m_ret = False
        if mdata.get('retcode'):
            ret['result'] = False
            fail.add(minion)
        if mdata.get('failed', False):
            fail.add(minion)
        else:
            if 'return' in mdata and 'ret' not in mdata:
                mdata['ret'] = mdata.pop('return')
            if 'ret' in mdata:
                m_ret = mdata['ret']
            if 'stderr' in mdata or 'stdout' in mdata:
                m_ret = {
                    'retcode': mdata.get('retcode'),
                    'stderr': mdata.get('stderr'),
                    'stdout': mdata.get('stdout')
                }
            if m_ret is False:
                fail.add(minion)

        ret['changes'][minion] = m_ret

    if not cmd_ret:
        ret['result'] = False
        ret['comment'] = 'No minions responded'
    else:
        if fail:
            ret['result'] = False
            ret['comment'] = 'Running function {} failed on minions: {}'.format(
                name, ', '.join(fail)
            )
        else:
            ret['comment'] = 'Function ran successfully'

    return ret
