import logging
import salt.utils.files
import salt.utils.yaml

log = logging.getLogger(__name__)


DEFAULT_POD_NETWORK = '10.233.0.0/16'
DEFAULT_SERVICE_NETWORK = '10.96.0.0/12'


def ext_pillar(minion_id, pillar, bootstrap_config):
    log.debug('Loading MetalK8s configuration from {}'.format(bootstrap_config))

    obj = None
    with salt.utils.files.fopen(bootstrap_config, 'rb') as fd:
        obj = salt.utils.yaml.safe_load(fd)

    assert obj.get('apiVersion') == 'metalk8s.scality.com/v1alpha1'
    assert obj.get('kind') == 'BootstrapConfiguration'

    assert 'networks' in obj
    assert 'controlPlane' in obj['networks']
    assert 'workloadPlane' in obj['networks']

    return {
        'networks': {
            'control_plane': obj['networks']['controlPlane'],
            'workload_plane': obj['networks']['workloadPlane'],
            'pod': obj['networks'].get('pods', DEFAULT_POD_NETWORK),
            'service': obj['networks'].get('services', DEFAULT_SERVICE_NETWORK),
        },
    }
