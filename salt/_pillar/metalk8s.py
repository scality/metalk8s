import logging

import salt.utils.files
import salt.utils.yaml


log = logging.getLogger(__name__)


DEFAULT_POD_NETWORK = '10.233.0.0/16'
DEFAULT_SERVICE_NETWORK = '10.96.0.0/12'


def _assert_equals(source_dict, expected_dict):
    error_tplt = "Expected value '{}' for key '{}', got '{}'"

    errors = [
        error_tplt.format(value, key, source_dict.get(key))
        for key, value in expected_dict.items()
        if source_dict.get(key) != value
    ]

    return errors


def _assert_keys(source_dict, keys):
    errors = []
    errors_tplt = "Expected presence of key '{}' in data: {}"

    for key in keys:
        if key not in source_dict:
            errors.append(errors_tplt.format(key, source_dict))

    return errors


def _load_config(path):
    log.debug('Loading MetalK8s configuration from %s', path)

    config = None
    with salt.utils.files.fopen(path, 'rb') as fd:
        config = salt.utils.yaml.safe_load(fd)

    expected = {
        'apiVersion': 'metalk8s.scality.com/v1alpha2',
        'kind': 'BootstrapConfiguration'
    }

    errs = _assert_equals(config, expected) + _assert_keys(config, ['products'])

    if errs:
        return {'_errors': errs}

    return config


def _load_networks(config_data):
    errors = _assert_keys(config_data, ['networks'])
    if errors:
        return {'_errors': errors}

    networks_data = config_data['networks']
    errors = _assert_keys(config_data, ['controlPlane', 'workloadPlane'])
    if errors:
        return {'_errors': errors}

    return {
        'control_plane': networks_data['controlPlane'],
        'workload_plane': networks_data['workloadPlane'],
        'pod': networks_data.get('pods', DEFAULT_POD_NETWORK),
        'service': networks_data.get('services', DEFAULT_SERVICE_NETWORK),
    }


def _load_ca(config_data):
    errors = _assert_keys(config_data, ['ca'])
    if errors:
        return {'_errors': errors}

    ca_data = config_data['ca']
    errors = _assert_keys(ca_data, ['minion'])
    if errors:
        return {'_errors': errors}

    return {
        'minion': ca_data['minion'],
    }


def _load_apiserver(config_data):
    errors = _assert_keys(config_data, ['apiServer'])
    if errors:
        return {'_errors': errors}

    as_data = config_data['apiServer']

    result = {
        'host': None,
        'keepalived': {
            'enabled': False,
            'virtualRouterId': 1,
            'authPassword': 'MeTaLk8s',
        },
    }

    errors = _assert_keys(as_data, ['host'])
    if errors:
        return {'_errors': errors}

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
    if config.get('_errors'):
        return {'_errors': config['errors']}

    result = {
        'networks': _load_networks(config),
        'metalk8s': {
            'products': _load_iso_path(config),
            'ca': _load_ca(config),
            'api_server': _load_apiserver(config),
        },
    }

    if '_errors' in result['networks']:
        result.setdefault('errors', []).append(
            result['networks'].pop('_errors')
        )

    metal_result = result['metalk8s']
    for key in ['ca', 'api_server']:
        if '_errors' in metal_result[key]:
            result.setdefault('errors', []).append(
                metal_result[key].pop('_errors')
            )

    return result
