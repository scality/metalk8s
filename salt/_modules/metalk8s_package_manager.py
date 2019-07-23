'''
Describes our custom way to deal with yum packages
so that we can support downgrade in metalk8s
'''

import logging

log = logging.getLogger(__name__)


__virtualname__ = 'metalk8s_package_manager'


def __virtual__():
    return __virtualname__


def _list_requires(pkg_name, version, fromrepo=None, result=None):
    '''
    Helper to list what requires a specific package without duplications
    '''
    if not result:
        result = {pkg_name: version}

    log.info(
        'Listing requires for "%s" with version "%s"',
        str(pkg_name),
        str(version)
    )

    command = [
        'repoquery', '--whatrequires', '--qf',
        '%{NAME} %{VERSION}-%{RELEASE}',
        '{}-{}'.format(str(pkg_name), str(version))
    ]

    if fromrepo:
        command.extend(['--disablerepo', '*', '--enablerepo', fromrepo])

    ret = __salt__['cmd.run_all'](command)

    if ret['retcode'] != 0:
        log.error(
            'Failed to list package "%s" requires: %s',
            str(pkg_name),
            ret['stderr'] or ret['stdout']
        )
        return result

    pkgs_dict = {}
    for line in ret['stdout'].splitlines():
        pkg, vers = line.strip().split()
        # Does not take the pkg two time even if it's different version
        if pkg not in result:
            result[pkg] = vers
            pkgs_dict[pkg] = vers

    for pkg, vers in pkgs_dict.items():
        result = _list_requires(pkg, vers, fromrepo=fromrepo, result=result)

    return result


def list_pkg_deps(pkg_name, version=None, fromrepo=None):
    '''
    Check dependencies related to the packages installed so that we can pass
    this information to pkg.installed

    pkg_name
        Name of the package installed

    version
        Version number of the package

        Use : salt '*' metalk8s_package_manager.list_pkg_deps kubelet 1.11.9
    '''
    pkgs_dict = {pkg_name: version}

    if not version:
        return pkgs_dict

    pkgs_dict = _list_requires(pkg_name, version, fromrepo=fromrepo)

    for pkg in pkgs_dict.keys():
        ret = __salt__['cmd.run_all'](
            ['rpm', '-qa', pkg]
        )

        if ret['retcode'] == 1:
            del pkgs_dict[pkg]
        elif ret['retcode'] != 0:
            log.error(
                'Failed to check if package "%s" is installed: %s',
                pkg,
                ret['stderr'] or ret['stdout']
            )
            return None

    return pkgs_dict
