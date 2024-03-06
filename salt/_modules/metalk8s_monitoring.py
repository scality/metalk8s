"""Utiliy methods to interact with MetalK8s monitoring.
"""

from salt.exceptions import CommandExecutionError

from datetime import datetime, timedelta

MISSING_DEPS = []

try:
    import requests
except ImportError:
    MISSING_DEPS.append("requests")

__virtualname__ = "metalk8s_monitoring"


def __virtual__():
    if MISSING_DEPS:
        error_msg = f"Missing dependencies: {', '.join(MISSING_DEPS)}"
        return False, error_msg

    return __virtualname__


def add_silence(
    value,
    name="alertname",
    is_equal=True,
    is_regex=False,
    starts_at=None,
    duration=3600,
    ends_at=None,
    time_format="%Y-%m-%dT%H:%M:%S",
    author="",
    comment="",
    **kwargs,
):
    """Add a new silence in Alertmanager.

    Arguments:

        value (str): value to check
        name (str): label to check
        is_regex (bool): Whether `value` should be treated as a regular
            expression or not, defaults to False.
        starts_at (str): Date when the silence starts, defaults to `now`.
        duration (int): Duration of the silence in seconds, defaults to `3600`.
        ends_at (str): Date when the silence ends, defaults to
            `starts_at` + `duration`.
        time_format (str): Time format for `starts_at` and `ends_at` arguments.
            Support the `datetime` Python library flags.
        author (str): Creator of the silence.
        comment (str): A description of why this silence has been put.

    CLI Examples:

    .. code-block:: bash

        salt-call metalk8s_monitoring.add_silence KubeMemOvercommit
        salt-call metalk8s_kubernetes.add_silence none name=severity
            starts_at="2020-05-05T07:14:52" duration=7200
    """
    if starts_at is None:
        starts_at = datetime.now()
    else:
        starts_at = datetime.strptime(starts_at, time_format)

    if ends_at is None:
        ends_at = starts_at + timedelta(seconds=duration)
    else:
        ends_at = datetime.strptime(ends_at, time_format)

    body = {
        "matchers": [
            {
                "name": name,
                "isEqual": is_equal,
                "isRegex": is_regex,
                "value": value,
            }
        ],
        "startsAt": starts_at.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "endsAt": ends_at.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "createdBy": author,
        "comment": comment,
        "status": {"state": "active"},
    }

    response = _requests_alertmanager_api(
        "api/v1/silences", "POST", json=body, **kwargs
    )

    return response["silenceId"]


def delete_silence(silence_id, **kwargs):
    """Delete a silence in Alertmanager

    Arguments:

        silence_id (str): ID of the silence to delete.

    CLI Examples:

    .. code-block:: bash

        salt-call metalk8s_monitoring.delete_silence \
            64d84a9e-cc6e-41ce-83ff-e84771ff6872
    """
    _requests_alertmanager_api(f"api/v1/silence/{silence_id}", "DELETE", **kwargs)


def get_silences(state=None, **kwargs):
    """Get the list of all silences in Alertmanager

    Arguments:

        state (str): Filter silences on their state (e.g. `active`),
            if None, return all silences, defaults to `None`.

    CLI Examples:

    .. code-block:: bash

        salt-call metalk8s_monitoring.get_silences
        salt-call metalk8s_monitoring.get_silences state=active
    """
    response = _requests_alertmanager_api("api/v1/silences", "GET", **kwargs)

    if state is not None:
        silences = [
            silence for silence in response if silence["status"]["state"] == state
        ]
    else:
        silences = response

    return silences


def get_alerts(state=None, **kwargs):
    """Get the list of all alerts in Alertmanager

    Arguments:

        state (str): Filter alerts on their state (e.g. `active`),
            if None, return all alerts, defaults to `None`.

    CLI Examples:

    .. code-block:: bash

        salt-call metalk8s_monitoring.get_alerts
        salt-call metalk8s_monitoring.get_alerts state=suppressed
    """
    response = _requests_alertmanager_api("api/v1/alerts", "GET", **kwargs)

    if state is not None:
        alerts = [alert for alert in response if alert["status"]["state"] == state]
    else:
        alerts = response

    return alerts


def _requests_alertmanager_api(route, method="GET", **kwargs):
    endpoints = __salt__["metalk8s_kubernetes.get_service_ips_and_ports"](
        "prometheus-operator-alertmanager",
        "metalk8s-monitoring",
        **kwargs,
    )

    try:
        ip = endpoints["ips"][0]
        port = endpoints["ports"]["http-web"]
        url = f"http://{ip}:{port}/{route}"
    except (IndexError, KeyError) as exc:
        raise CommandExecutionError(
            "Unable to get proper Alertmanager API endpoint: "
            f"Available endpoints: {endpoints}"
        ) from exc

    try:
        session = __utils__["metalk8s.requests_retry_session"]()
        response = session.request(method, url, **kwargs)
    except Exception as exc:
        raise CommandExecutionError(
            f"Unable to query Alertmanager API on {url}"
        ) from exc

    try:
        json = response.json()
    except ValueError as exc:
        if response.status_code != requests.codes.ok:
            error = (
                f"Received HTTP code {response.status_code} when "
                f"querying Alertmanager API on {url}"
            )
        else:
            error = (
                "Malformed response returned from Alertmanager API: "
                f"{exc}: {response.text}"
            )
        raise CommandExecutionError(error) from exc

    if json["status"] == "error":
        raise CommandExecutionError(f"{json['errorType']}: {json['error']}")

    return json.get("data")
