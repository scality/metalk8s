'''
Describes our custom way to deal with yum packages
so that we can support downgrade in metalk8s
'''

import logging

log = logging.getLogger(__name__)


__virtualname__ = 'metalk8s_package_manager'


def __virtual__():
    return __virtualname__


def list_pkg_deps(pkg_name, version=None, fromrepo=None):
    '''
    Check dependencies related to the packages installed so that we can pass
    this information to pkg.installed

    name
        Name of the package installed

    version
        Version number of the package

        Use : salt '*' metalk8s_package_manager.list_pkg_deps kubelet 1.11.9
    '''
    log.info(
        'Listing deps for "%s" with version "%s"',
        str(pkg_name),
        str(version)
    )
    pkgs_dict = {pkg_name: version}

    if not version:
        return pkgs_dict

    command_all = [
        'repoquery', '--whatrequires', '--recursive', '--qf',
        '%{NAME} %{VERSION}-%{RELEASE}',
        '{}-{}'.format(str(pkg_name), str(version))
    ]

    if fromrepo:
        command_all.extend(['--disablerepo', '*', '--enablerepo', fromrepo])

    deps_list = __salt__['cmd.run_all'](command_all)

    if deps_list['retcode'] != 0:
        log.error(
            'Failed to list package dependencies: %s',
            deps_list['stderr'] or deps_list['stdout']
        )
        return None

    out = deps_list['stdout'].splitlines()
    for line in out:
        name, version = line.strip().split()
        pkgs_dict[name] = version

    for key in pkgs_dict.keys():
        package_query = __salt__['cmd.run_all'](
            ['rpm', '-qa', key]
        )

        if package_query['retcode'] == 1:
            pkgs_dict.pop(key)
        elif package_query['retcode'] != 0:
            log.error(
                'Failed to check if package is installed: %s',
                deps_list['stderr'] or deps_list['stdout']
            )
            return None

    return pkgs_dict
