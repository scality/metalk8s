"""Custom states for MetalK8s."""

import time


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

    Expects the template to use the `config_digest` variable and store it in
    the `metadata.annotations` section, with the key
    `metalk8s.scality.com/config-digest`.

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

    return __states__["file.managed"](
        name,
        source,
        template=kwargs.pop("template", "jinja"),
        user=kwargs.pop("user", "root"),
        group=kwargs.pop("group", "root"),
        mode=kwargs.pop("mode", "0600"),
        makedirs=kwargs.pop("makedirs", False),
        backup=kwargs.pop("backup", False),
        context=dict(context or {}, config_digest=config_digest),
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
