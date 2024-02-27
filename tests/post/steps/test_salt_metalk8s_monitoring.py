from pytest_bdd import scenario, given, then, when

from tests import utils


# Scenario {{{


@scenario("../features/salt_metalk8s_monitoring.feature", "List all alerts")
def test_salt_metalk8s_monitoring_list_all_alerts():
    pass


@scenario("../features/salt_metalk8s_monitoring.feature", "Silence Watchdog alert")
def test_salt_metalk8s_monitoring_silence_watchdog_alert():
    pass


@scenario("../features/salt_metalk8s_monitoring.feature", "Unsilence Watchdog alert")
def test_salt_metalk8s_monitoring_unsilence_watchdog_alert():
    pass


# }}}
# Given {{{


@given("the Watchdog alert is present")
def check_watchdog_alert(host):
    alerts = call_metalk8s_monitoring_get_alerts(host)
    confirm_watchdog_alert(alerts)


@given(
    "the silence for the Watchdog alert is present",
    target_fixture="silence_id",
)
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
    return silences[0]["id"]


# }}}
# When {{{


@when(
    "we list all the alerts",
    target_fixture="alerts",
)
def call_metalk8s_monitoring_get_alerts(host):
    alerts = utils.run_salt_command(host, "metalk8s_monitoring.get_alerts")
    return alerts


@when(
    "we list all the silences",
    target_fixture="silences",
)
def call_metalk8s_monitoring_get_silences(host):
    silences = utils.run_salt_command(host, "metalk8s_monitoring.get_silences")
    return silences


@when(
    "we silence the Watchdog alert",
    target_fixture="silence_id",
)
def call_metalk8s_monitoring_add_silence_watchdog(host):
    silence_id = utils.run_salt_command(
        host,
        "metalk8s_monitoring.add_silence",
        "Watchdog",
        "Test silence for Watchdog alert",
    )
    return silence_id


@when(
    "we delete the silence for the Watchdog alert",
)
def call_metalk8s_monitoring_delete_silence_watchdog(host, silence_id):
    utils.run_salt_command(
        host,
        "metalk8s_monitoring.delete_silence",
        silence_id,
    )


# }}}
# Then {{{


@then("the Watchdog alert should be present")
def confirm_watchdog_alert(alerts):
    assert any(
        alert["labels"]["alertname"] == "Watchdog" for alert in alerts["return"]
    ), "No Watchdog alert found"


@then("the Watchdog alert should not be present")
def confirm_watchdog_alert_not_present(alerts):
    assert all(
        alert["labels"]["alertname"] != "Watchdog" for alert in alerts["return"]
    ), "Watchdog alert found"


@then("the silence for the Watchdog alert should not be present")
def confirm_watchdog_silence_not_present(silences):
    assert all(
        silence["name"] != "Watchdog" for silence in silences["return"]
    ), "Watchdog silence found"


# }}}
