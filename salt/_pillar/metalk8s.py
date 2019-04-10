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


def ext_pillar(minion_id, pillar, bootstrap_config):
    config = _load_config(bootstrap_config)

    return {
        'networks': _load_networks(config),
        'metalk8s': {
            'ca': _load_ca(config),
        },
    }
