import logging

import salt.utils.files
import salt.utils.yaml


log = logging.getLogger(__name__)


DEFAULT_POD_NETWORK = '10.233.0.0/16'
DEFAULT_SERVICE_NETWORK = '10.96.0.0/12'


def _load_config(path):
    log.debug('Loading MetalK8s configuration from %s', path)

    config = None
    with salt.utils.files.fopen(path, 'rb') as fd:
        config = salt.utils.yaml.safe_load(fd)

    expected = {
        'apiVersion': 'metalk8s.scality.com/v1alpha2',
        'kind': 'BootstrapConfiguration'
    }

    errors = (
        __utils__['pillar_utils.assert_equals'](config, expected) +
        __utils__['pillar_utils.assert_keys'](config, ['products'])
    )

    if errors:
        return __utils__['pillar_utils.errors_to_dict'](errors)

    return config


def _load_networks(config_data):
    errors = __utils__['pillar_utils.assert_keys'](config_data, ['networks'])
    if errors:
        return __utils__['pillar_utils.errors_to_dict'](errors)

    networks_data = config_data['networks']
    errors = __utils__['pillar_utils.assert_keys'](
        networks_data,
        ['controlPlane', 'workloadPlane']
    )
    if errors:
        return __utils__['pillar_utils.errors_to_dict'](errors)

    return {
        'control_plane': networks_data['controlPlane'],
        'workload_plane': networks_data['workloadPlane'],
        'pod': networks_data.get('pods', DEFAULT_POD_NETWORK),
        'service': networks_data.get('services', DEFAULT_SERVICE_NETWORK),
    }


def _load_ca(config_data):
    errors = __utils__['pillar_utils.assert_keys'](config_data, ['ca'])
    if errors:
        return __utils__['pillar_utils.errors_to_dict'](errors)

    ca_data = config_data['ca']
    errors = __utils__['pillar_utils.assert_keys'](ca_data, ['minion'])
    if errors:
        return __utils__['pillar_utils.errors_to_dict'](errors)

    return {
        'minion': ca_data['minion'],
    }


def _load_apiserver(config_data):
    errors = __utils__['pillar_utils.assert_keys'](config_data, ['apiServer'])
    if errors:
        return __utils__['pillar_utils.errors_to_dict'](errors)

    as_data = config_data['apiServer']

    result = {
        'host': None,
        'keepalived': {
            'enabled': False,
            'virtualRouterId': 1,
            'authPassword': 'MeTaLk8s',
        },
    }

    errors = __utils__['pillar_utils.assert_keys'](as_data, ['host'])
    if errors:
        return __utils__['pillar_utils.errors_to_dict'](errors)

    result['host'] = as_data['host']

    if 'keepalived' in as_data:
        k_data = as_data['keepalived']
        k_result = result['keepalived']

        for (key, default) in k_result.items():
            k_result[key] = k_data.get(key, default)

    return result


def _load_iso_path(config_data):
    """Load iso path from BootstrapConfiguration

    """
    res = config_data['products']['metalk8s']

    if isinstance(res, str):
        res = [res]

    if not isinstance(res, list):
        return __utils__['pillar_utils.errors_to_dict']([
            "Invalid products format in config file, list or string expected "
            "got {1}."
            .format(res)
        ])

    return res

def ext_pillar(minion_id, pillar, bootstrap_config):
    config = _load_config(bootstrap_config)
    if config.get('_errors'):
        metal_data = __utils__['pillar_utils.errors_to_dict'](
            config['_errors']
        )

    else:
        metal_data = {
            'products': _load_iso_path(config),
            'ca': _load_ca(config),
            'api_server': _load_apiserver(config),
        }

    result = {
        'networks': _load_networks(config),
        'metalk8s': metal_data
    }

    if not isinstance(metal_data['products'], list):
        # Special case for products in pillar
        __utils__['pillar_utils.promote_errors'](metal_data, 'products')
    for key in ['ca', 'api_server']:
        __utils__['pillar_utils.promote_errors'](metal_data, key)
    for key in ['networks', 'metalk8s']:
        __utils__['pillar_utils.promote_errors'](result, key)

    return result
