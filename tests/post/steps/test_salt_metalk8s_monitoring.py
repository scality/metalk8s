import json
import pytest
from pytest_bdd import scenario, given, then, when

from tests import utils


# Scenario {{{


@scenario("../features/salt_metalk8s_monitoring.feature", "List all alerts")
def test_salt_metalk8s_monitoring_list_all_alerts(host):
    pass


#@scenario("../features/salt_metalk8s_monitoring.feature", "Silence Watchdog alert")
#def test_salt_metalk8s_monitoring_silence_watchdog_alert():
#    pass


#@scenario("../features/salt_metalk8s_monitoring.feature", "Unsilence Watchdog alert")
#def test_salt_metalk8s_monitoring_unsilence_watchdog_alert():
#    pass


@pytest.fixture(scope="function")
def context():
    return {}


# }}}
# Given {{{


@given("the Watchdog alert is present")
def check_watchdog_alert(context):
    confirm_watchdog_alert(context)


@given("the silence for the Watchdog alert is present")
def check_watchdog_silence(host):
    silences = utils.run_salt_command(
        host,
        "metalk8s_monitoring.get_silences",
        state="active",
    )
    silences = [
        silence for silence in silences["return"] if silence["name"] == "Watchdog"
    ]
    assert silences, "No silence found for the Watchdog alert"


# }}}
# When {{{


@when("we list all the alerts")
def call_metalk8s_monitoring_get_alerts(host, ssh_config, context):
    result = utils.run_salt_command(
        host, 
        [
            "salt-run",
            "salt.cmd",
            "metalk8s_monitoring.get_alerts",
        ],
        ssh_config,
    )
    context["alerts"] = json.loads(result.stdout)


@when("we list all the silences")
def call_metalk8s_monitoring_get_silences(host, context):
    context["silences"] = utils.run_salt_command(
        host, "metalk8s_monitoring.get_silences"
    )


@when("we silence the Watchdog alert")
def call_metalk8s_monitoring_add_silence_watchdog(host, context):
    context["silence_id"] = utils.run_salt_command(
        host,
        "metalk8s_monitoring.add_silence",
        "Watchdog",
        "Test silence for Watchdog alert",
    )


@when("we delete the silence for the Watchdog alert")
def call_metalk8s_monitoring_delete_silence_watchdog(host, context):
    utils.run_salt_command(
        host,
        "metalk8s_monitoring.delete_silence",
        context["silence_id"],
    )


# }}}
# Then {{{


@then("the Watchdog alert should be present")
def confirm_watchdog_alert(context):
    assert any(
        alert["labels"]["alertname"] == "Watchdog"
        for alert in context["alerts"]["return"]
    ), "No Watchdog alert found"


@then("the Watchdog alert should not be present")
def confirm_watchdog_alert_not_present(context):
    assert all(
        alert["labels"]["alertname"] != "Watchdog"
        for alert in context["alerts"]["return"]
    ), "Watchdog alert found"


@then("the silence for the Watchdog alert should be present")
def confirm_watchdog_silence_not_present(context):
    assert any(
        silence["name"] == "Watchdog" for silence in context["silences"]["return"]
    ), "Watchdog silence not found"


@then("the silence for the Watchdog alert should not be present")
def confirm_watchdog_silence_not_present(context):
    assert all(
        silence["name"] != "Watchdog" for silence in context["silences"]["return"]
    ), "Watchdog silence found"


# }}}
