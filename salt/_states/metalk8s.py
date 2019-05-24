"""Custom states for MetalK8s."""

import time


__virtualname__ = "metalk8s"


def __virtual__():
    return __virtualname__


def static_pod_managed(name, source, config_files=None, context=None):
    """Simple helper to edit a static Pod manifest if configuration changes.

    Expects the template to use the `config_digest` variable and store it in
    the `metadata.annotations` section, with the key
    `metalk8s.scality.com/config-digest`.
    """
    config_file_digests = [
        __salt__["hashutil.digest_file"](config_file, checksum="sha256")
        for config_file in config_files or []
    ]
    config_digest = __salt__["hashutil.md5_digest"](
        "-".join(config_file_digests)
    )

    return __states__["file.managed"](
        name,
        source,
        template="jinja",
        user="root",
        group="root",
        mode="0600",
        makedirs=False,
        backup=False,
        context=dict(context or {}, config_digest=config_digest),
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
