from pytest_bdd import given

from tests import kube_utils
from tests import utils


@given('the Salt Master is running')
def check_salt_master(k8s_client):
    def _get_salt_master_pods():
        pods = kube_utils.get_pods(
            k8s_client,
            label='app=salt-master',
            namespace='kube-system',
            state='Running',
        )
        assert len(pods) >= 1

    utils.retry(
        _get_salt_master_pods,
        times=20,
        wait=3,
        error_msg="There is no `salt-master` Pod running",
    )
