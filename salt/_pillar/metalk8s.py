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

    assert config.get('apiVersion') == 'metalk8s.scality.com/v1alpha2'
    assert config.get('kind') == 'BootstrapConfiguration'
    assert 'products' in config

    return config


def _load_networks(config_data):
    assert 'networks' in config_data

    networks_data = config_data['networks']
    assert 'controlPlane' in config_data['networks']
    assert 'workloadPlane' in config_data['networks']

    return {
        'control_plane': networks_data['controlPlane'],
        'workload_plane': networks_data['workloadPlane'],
        'pod': networks_data.get('pods', DEFAULT_POD_NETWORK),
        'service': networks_data.get('services', DEFAULT_SERVICE_NETWORK),
    }


def _load_ca(config_data):
    assert 'ca' in config_data

    ca_data = config_data['ca']
    assert 'minion' in ca_data

    return {
        'minion': ca_data['minion'],
    }


def _load_apiserver(config_data):
    assert 'apiServer' in config_data

    as_data = config_data['apiServer']

    result = {
        'host': None,
        'keepalived': {
            'enabled': False,
            'virtualRouterId': 1,
            'authPassword': 'MeTaLk8s',
        },
    }

    assert 'host' in as_data

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
        return {"_errors": [
            "Invalid products format in config file, list or string expected "
            "got {1}."
            .format(res)
        ]}

    return res


def ext_pillar(minion_id, pillar, bootstrap_config):
    config = _load_config(bootstrap_config)

    return {
        'networks': _load_networks(config),
        'metalk8s': {
            'products': _load_iso_path(config),
            'ca': _load_ca(config),
            'api_server': _load_apiserver(config),
        },
    }
