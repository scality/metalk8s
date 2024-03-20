import json
import time

import pytest
from pytest_bdd import parsers, scenario, then, when

from tests.utils import negation, run_salt_command, retry

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

# When {{{


@when(
    parsers.parse("we list the '{silence_state}' silences"),
)
def call_metalk8s_monitoring_get_silences(host, ssh_config, context, silence_state):
    command = [
        "salt-run",
        "salt.cmd",
        "metalk8s_monitoring.get_silences",
        "--out json",
        "--log-level quiet",
    ]
    if silence_state not in ["all", "active", "expired"]:
        raise ValueError(f"Invalid silence state: {silence_state}")
    if silence_state != "all":
        command.append(f"state={silence_state}")
    result = run_salt_command(
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
    result = run_salt_command(
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
    result = run_salt_command(
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
        "--out json",
        "--log-level quiet",
    ]
    if alert_state not in ["all", "active", "suppressed"]:
        raise ValueError(f"Invalid alert state: {alert_state}")
    if alert_state != "all":
        command.append(f"state={alert_state}")
    result = run_salt_command(
        host,
        command,
        ssh_config,
    )
    context[f"alerts_{alert_state}"] = json.loads(result.stdout)


# }}}
# Then {{{


@then(
    parsers.cfparse(
        "there should{negated:Negation?} be silences '{silence_state}'",
        extra_types={"Negation": negation},
    )
)
def confirm_silences(context, negated, silence_state):
    result = bool(context[f"silences_{silence_state}"])
    if negated:
        assert not result, f"Silences in {silence_state} state found"
    else:
        assert result, f"Silences in {silence_state} state not found"


@then(
    parsers.cfparse(
        "we should{negated:Negation?} find the silence for the '{alert_name}' alert "
        "in the '{silence_state}' silences list",
        extra_types={"Negation": negation},
    ),
)
def find_silence_for_alert(context, negated, alert_name, silence_state):
    try:
        silence = next(
            silence
            for silence in context[f"silences_{silence_state}"]
            if silence["matchers"][0]["value"] == alert_name
        )
    except StopIteration:
        silence = None
    if negated:
        assert not silence, f"Silence for {alert_name} alert found"
        context.pop(f"silence_{alert_name}", None)
    else:
        assert silence, f"Silence for {alert_name} alert not found"
        context[f"silence_{alert_name}"] = silence


@then(
    parsers.cfparse(
        "the '{alert_name}' alert should{negated:Negation?} be "
        "in the list of '{alert_state}' alerts",
        extra_types={"Negation": negation},
    ),
)
def confirm_alert(context, alert_name, negated, alert_state):
    result = any(
        alert["labels"]["alertname"] == alert_name
        for alert in context[f"alerts_{alert_state}"]
    )
    if negated:
        assert not result, f"{alert_name} alert is in {alert_state} alerts list"
    else:
        assert result, f"{alert_name} alert is not in {alert_state} alerts list"


@then(
    parsers.parse(
        "we poll the '{alert_state}' alerts "
        "until find the '{alert_name}' alert or "
        "fail after {timeout:d} seconds"
    ),
)
def poll_alerts(host, ssh_config, context, alert_state, alert_name, timeout):
    def _wait_check_alert():
        call_metalk8s_monitoring_get_alerts(host, ssh_config, context, alert_state)
        result = any(
            alert["labels"]["alertname"] == alert_name
            for alert in context[f"alerts_{alert_state}"]
        )
        assert result, f"{alert_name} alert not found in {alert_state} alerts list"

    retry(_wait_check_alert, times=int(timeout / 10), wait=10)


# }}}
