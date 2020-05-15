import json

import pytest
from pytest_bdd import scenario, then
import requests

from tests import utils

# Scenarios
@scenario('../features/ui_alive.feature', 'Reach the UI')
def test_ui(host):
    pass


@then("we can reach the UI")
def reach_UI(host):
    ip = utils.get_grain(host, 'metalk8s:control_plane_ip')

    response = requests.get(
        'https://{ip}:8443'.format(ip=ip),
        verify=False,
    )

    assert response.status_code == 200, response.text
