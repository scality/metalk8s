# -*- coding: utf-8 -*-

import yaml

__virtualname__ = 'metalk8s_kubeconfigs'


def __virtual__():
    return __virtualname__


def admin_confs():
    """Read identity info from /etc/kubernetes/admin.conf

    :returns: a dict with information about admin identity
              or None if the kubeconf file does not exists

    :note:  this module is mainly used to feed auth for kubernetes state.
            so we return none intead of exception in order to not break
            state generation
    """
    admin_confs = {}
    try:
        with open('/etc/kubernetes/admin.conf', 'r') as fd:
            kubeconfig = yaml.safe_load(fd)
    except Exception:
        return None

    try:
        admin_confs['api_url'] = kubeconfig[
            'clusters'][0]['cluster']['server']
    except (KeyError, IndexError):
        return None

    try:
        admin_confs['certificate-authority-data'] = kubeconfig[
            'clusters'][0]['cluster']['certificate-authority-data']
    except (KeyError, IndexError):
        return None

    try:
        admin_confs['client-certificate-data'] = kubeconfig[
            'users'][0]['user']['client-certificate-data']
    except (KeyError, IndexError):
        return None

    try:
        admin_confs['client-key-data'] = kubeconfig[
            'users'][0]['user']['client-key-data']
    except (KeyError, IndexError):
        return None

    return admin_confs
