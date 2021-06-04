from pytest_bdd import scenario, then
import requests


# Scenarios
@scenario("../features/ui_alive.feature", "Reach the UI")
def test_ui(host):
    pass


@then("we can reach the UI")
def reach_UI(host, control_plane_ingress_ep):
    response = requests.get(
        control_plane_ingress_ep,
        verify=False,
    )

    assert response.status_code == 200, response.text
