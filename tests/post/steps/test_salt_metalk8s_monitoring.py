import json
import time

import pytest
from pytest_bdd import parsers, scenario, given, then, when

from tests import utils

# Fixtures {{{


@pytest.fixture(scope="function")
def context():
    return {}


# }}}
# Scenario {{{


@scenario(
    "../features/salt_metalk8s_monitoring.feature",
    "There are no silences active",
)
def test_there_is_no_silences_active(host):
    pass


@scenario(
    "../features/salt_metalk8s_monitoring.feature",
    "Watchdog is one of active alerts",
)
def test_watchdog_is_one_of_active_alerts(host):
    pass


@scenario(
    "../features/salt_metalk8s_monitoring.feature",
    "Silence and Unsilence the Watchdog alert",
)
def test_watchdog_is_silenced(host):
    pass



# }}}
# Given {{{


# }}}
# When {{{


@when(
    parsers.parse("we list the '{silence_state}' silences"),
)
def call_metalk8s_monitoring_get_silences(host, ssh_config, context, silence_state):
    command = [
        "salt-run",
        "salt.cmd",
        "metalk8s_monitoring.get_silences",
    ]
    if silence_state not in ["all", "active", "expired"]:
        raise ValueError(f"Invalid silence state: {silence_state}")
    if silence_state != "all":
        command.append(f"state={silence_state}")
    command.append("--out json")
    command.append("--log-level quiet")
    result = utils.run_salt_command(
        host, 
        command,
        ssh_config,
    )
    context[f"silences_{silence_state}"] = json.loads(result.stdout)


@when(
    parsers.parse("we create a silence for the '{alert_name}' alert"),
)
def call_metalk8s_monitoring_add_silence(host, ssh_config, context, alert_name):
    command = [
        "salt-run",
        "salt.cmd",
        "metalk8s_monitoring.add_silence",
        f"value={alert_name}",
        "duration=3600",
        "--out json",
        "--log-level quiet",
    ]
    result = utils.run_salt_command(
        host, 
        command,
        ssh_config,
    )
    context[f"silence_{alert_name}"] = json.loads(result.stdout)


@when(
    parsers.parse("we delete the silence for the '{alert_name}' alert"),
)
def call_metalk8s_monitoring_delete_silence(host, ssh_config, context, alert_name):
    silence_id = context[f"silence_{alert_name}"]["id"]
    command = [
        "salt-run",
        "salt.cmd",
        "metalk8s_monitoring.delete_silence",
        silence_id,
        "--out json",
        "--log-level quiet",
    ]
    result = utils.run_salt_command(
        host, 
        command,
        ssh_config,
    )
    context[f"silence_{alert_name}"] = json.loads(result.stdout)


@when(
    parsers.parse("we list the '{alert_state}' alerts"),
)
def call_metalk8s_monitoring_get_alerts(host, ssh_config, context, alert_state):
    command = [
        "salt-run",
        "salt.cmd",
        "metalk8s_monitoring.get_alerts",
    ]
    if alert_state not in ["all", "active", "suppressed"]:
        raise ValueError(f"Invalid alert state: {alert_state}")
    if alert_state != "all":
        command.append(f"state={alert_state}")
    command.append("--out json")
    command.append("--log-level quiet")
    result = utils.run_salt_command(
        host, 
        command,
        ssh_config,
    )
    context[f"alerts_{alert_state}"] = json.loads(result.stdout)


@when(
    parsers.parse("we wait for '{seconds}' seconds"),
)
def wait_seconds(seconds):
    time.sleep(int(seconds))


# }}}
# Then {{{


@then(
    parsers.parse("there '{condition}' silences '{silence_state}'"),
)
def confirm_silences(context, condition, silence_state):
    result = bool(context[f"silences_{silence_state}"])
    if condition == "should be":
        assert result, f"Silences in {silence_state} state not found"
    elif condition == "should not be":
        assert not result, f"Silences in {silence_state} state found"
    else:
        raise ValueError(f"Invalid condition: {condition}")


@then(
    parsers.parse(
        "we '{condition}' find the silence for the '{alert_name}' alert "
        "in the '{silence_state}' silences list",
    ),
)
def find_silence_for_alert(context, condition, alert_name, silence_state):
    try:
        silence = next(
            silence
            for silence in context[f"silences_{silence_state}"]
            if silence["matchers"][0]["value"] == alert_name
        )
    except StopIteration:
        silence = None
    if condition == "should":
        assert silence, f"Silence for {alert_name} alert not found"
        context[f"silence_{alert_name}"] = silence
    elif condition == "should not":
        assert not silence, f"Silence for {alert_name} alert found"
        context.pop(f"silence_{alert_name}", None)
    else:
        raise ValueError(f"Invalid condition: {condition}")


@then(
    parsers.parse("the '{alert_name}' alert '{condition}' in the list of '{alert_state}' alerts"),
)
def confirm_alert(context, alert_name, condition, alert_state):
    result = any(
        alert["labels"]["alertname"] == alert_name
        for alert in context[f"alerts_{alert_state}"]
    )
    if condition == "should be":
        assert result, f"{alert_name} alert is not in {alert_state} alerts list"
    elif condition == "should not be":
        assert not result, f"{alert_name} alert is in {alert_state} alerts list"
    else:
        raise ValueError(f"Invalid condition: {condition}")


# }}}
