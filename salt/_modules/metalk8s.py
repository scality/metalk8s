# -*- coding: utf-8 -*-
'''
Module for handling MetalK8s specific calls.
'''
import logging


log = logging.getLogger(__name__)

__virtualname__ = 'metalk8s'


def __virtual__():
    '''
    Check dependencies
    '''
    return __virtualname__


def get_control_plane_ips():
    '''
    Get control plane IPs using CIDR from pillar
    '''
    cidr = __pillar__.get('networks', {}).get('control_plane')

    if not cidr:
        return

    return __salt__['network.ip_addrs'](cidr=cidr)


def get_workload_plane_ips():
    '''
    Get worload plane IPs using CIDR from pillar
    '''
    cidr = __pillar__.get('networks', {}).get('workload_plane')

    if not cidr:
        return

    return __salt__['network.ip_addrs'](cidr=cidr)
