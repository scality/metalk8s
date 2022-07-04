import functools
import ipaddress
import json
import logging
import re
import os
import operator
import testinfra
import time
from typing import Optional, Dict

import requests
from requests.adapters import HTTPAdapter
from requests.packages.urllib3.util.retry import Retry

import pytest


LOGGER = logging.getLogger(__name__)


def retry(operation, times=1, wait=1, error_msg=None, name="default"):
    last_assert = None
    for idx in range(times):
        try:
            res = operation()
        except AssertionError as exc:
            last_assert = str(exc)
            LOGGER.info("[%s] Attempt %d/%d failed: %s", name, idx, times, str(exc))
            time.sleep(wait)
        else:
            LOGGER.info("[%s] Attempt %d/%d succeeded", name, idx, times)
            return res
    else:
        if error_msg is None:
            error_msg = (
                "Failed to run operation '{name}' after {attempts} attempts "
                "(waited {total}s in total)"
            ).format(name=name, attempts=times, total=times * wait)

        if last_assert:
            error_msg = error_msg + ": " + last_assert

        pytest.fail(error_msg)


def write_string(host, dest, contents):
    return host.run("cat > {} << EOF\n{}\nEOF".format(dest, contents))


def get_ip_from_cidr(host, cidr):
    network = ipaddress.IPv4Network(cidr)
    with host.sudo():
        ip_info = host.check_output("ip a | grep 'inet '")
    for line in ip_info.splitlines():
        match = re.match(r"inet (?P<ip>[0-9]+(?:\.[0-9]+){3})/[0-9]+ ", line.strip())
        assert match is not None, "Unexpected format: {}".format(line.strip())
        candidate = match.group("ip")
        if ipaddress.IPv4Address(candidate) in network:
            return candidate
    return None


def get_node_name(nodename, ssh_config=None):
    """Get a node name (from SSH config)."""
    if ssh_config is not None:
        node = testinfra.get_host(nodename, ssh_config=ssh_config)
        return get_grain(node, "id")
    return nodename


# Source: https://www.peterbe.com/plog/best-practice-with-retries-with-requests
def requests_retry_session(
    retries=3,
    backoff_factor=0.3,
    status_forcelist=(500, 503),
    method_whitelist=frozenset(["GET", "POST"]),
    session=None,
):
    """Configure a `requests.session` for retry on error.

    By default, this helper performs 3 retries with an exponential sleep
    interval between each request and only retries internal server errors(500)
    & service unavailable errors(503)

    Arguments:
        retries:          The number of retries to perform before giving up
        backoff_factor:   The sleep interval between requests computed as
                          {backoff factor} * (2 ^ ({number retries} - 1))
        status_forcelist: HTTP status codes that we should force a retry on
        method_whitelist: uppercased HTTP methods that we should retry
        session:          Used to create a session

    Returns:
        A `requests.Session` object configured for retry.
    """
    session = session or requests.Session()
    retry = Retry(
        total=retries,
        read=retries,
        connect=retries,
        backoff_factor=backoff_factor,
        status_forcelist=status_forcelist,
        method_whitelist=method_whitelist,
    )
    adapter = HTTPAdapter(max_retries=retry)
    session.mount("http://", adapter)
    session.mount("https://", adapter)
    return session


def kubectl_exec(host, command, pod, kubeconfig="/etc/kubernetes/admin.conf", **kwargs):
    """Grab the return code from a `kubectl exec`"""
    kube_args = ["--kubeconfig", kubeconfig]

    if kwargs.get("container"):
        kube_args.extend(["-c", kwargs.get("container")])
    if kwargs.get("namespace"):
        kube_args.extend(["-n", kwargs.get("namespace")])

    kubectl_cmd_tplt = "kubectl exec {} {} -- {}"

    with host.sudo():
        output = host.run(
            kubectl_cmd_tplt.format(pod, " ".join(kube_args), " ".join(command))
        )
        return output


def run_salt_command(host, command, ssh_config):
    """Run a command inside the salt-master container."""

    pod = "salt-master-{}".format(get_node_name("bootstrap", ssh_config))

    output = kubectl_exec(
        host, command, pod, container="salt-master", namespace="kube-system"
    )

    assert output.exit_status == 0, "command {} failed with: \nout: {}\nerr: {}".format(
        command, output.stdout, output.stderr
    )

    return output


def get_dict_element(data, path, delimiter="."):
    """
    Traverse a dict using a 'delimiter' on a target string.
    getitem(a, b) returns the value of a at index b
    """
    return functools.reduce(
        operator.getitem,
        (int(k) if k.isdigit() else k for k in path.split(delimiter)),
        data,
    )


def set_dict_element(data, path, value, delimiter="."):
    """
    Traverse a nested dict using a delimiter on a target string
    and replace the value of a key
    """
    current = data
    elements = [int(k) if k.isdigit() else k for k in path.split(delimiter)]
    for element in elements[:-1]:
        if isinstance(element, int):
            current = current[element] if len(current) > element else []
        else:
            current = current.setdefault(element, {})
    current[elements[-1]] = value


def get_grain(host, key):
    with host.sudo():
        output = host.check_output(
            'salt-call --local --out=json grains.get "{}"'.format(key)
        )
        grain = json.loads(output)["local"]

    return grain


def get_pillar(host, key, local=False):
    with host.sudo():
        output = host.check_output(
            'salt-call {} --out=json pillar.get "{}"'.format(
                "--local" if local else "", key
            )
        )
        return json.loads(output)["local"]


def patch_bootstrap_config(context, host, patch):
    if "bootstrap_to_restore" not in context:
        with host.sudo():
            cmd_ret = host.check_output("salt-call --out json --local temp.dir")

        tmp_dir = json.loads(cmd_ret)["local"]

        with host.sudo():
            host.check_output("cp /etc/metalk8s/bootstrap.yaml {}".format(tmp_dir))

        context["bootstrap_to_restore"] = os.path.join(tmp_dir, "bootstrap.yaml")

    with host.sudo():
        host.check_output(
            "salt-call --local --retcode-passthrough state.single "
            "file.serialize /etc/metalk8s/bootstrap.yaml "
            "dataset='{}' "
            "merge_if_exists=True".format(json.dumps(patch))
        )


class BaseAPIError(Exception):
    """Some error occurred when using a `BaseAPI` subclass."""


class BaseAPI:
    ERROR_CLS = BaseAPIError

    def __init__(self, endpoint):
        self.endpoint = endpoint.rstrip("/")
        self.session = requests_retry_session()

    def request(self, method, route, **kwargs):
        kwargs.setdefault("verify", False)
        try:
            response = self.session.request(
                method, f"{self.endpoint}/{route.lstrip('/')}", **kwargs
            )
            response.raise_for_status()
        except requests.exceptions.RequestException as exc:
            raise self.ERROR_CLS(exc)

        try:
            return response.json()
        except ValueError as exc:
            raise self.ERROR_CLS(exc)


class PrometheusApiError(BaseAPIError):
    pass


class PrometheusApi(BaseAPI):
    ERROR_CLS = PrometheusApiError

    def query(self, metric_name, **query_matchers):
        matchers = [
            '{}="{}"'.format(key, value) for key, value in query_matchers.items()
        ]
        query_string = metric_name + "{" + ",".join(matchers) + "}"
        return self.request("GET", "api/v1/query", params={"query": query_string})

    def get_alerts(self, **kwargs):
        return self.request("GET", "api/v1/alerts", **kwargs)

    def get_rules(self, **kwargs):
        return self.request("GET", "api/v1/rules", **kwargs)

    def find_rules(self, name=None, group=None, labels=None, **kwargs):
        if not labels:
            labels = {}
        rules = []

        response = self.get_rules(**kwargs)

        for rule_group in response.get("data", {}).get("groups", []):
            group_name = rule_group.get("name")
            if group in (group_name, None):
                for rule in rule_group.get("rules", []):
                    if name in (rule.get("name"), None):
                        if labels.items() <= rule.get("labels", {}).items():
                            rule["group"] = group_name
                            rules.append(rule)

        return rules

    def get_targets(self, **kwargs):
        return self.request("GET", "api/v1/targets", **kwargs)


class GrafanaAPIError(BaseAPIError):
    pass


class GrafanaAPI(BaseAPI):
    ERROR_CLS = GrafanaAPIError

    def get_admin_stats(self):
        # FIXME: this user should not exist... but it's helpful in tests O:)
        return self.request("GET", "api/admin/stats", auth=("admin", "admin"))

    def get_dashboards(self):
        return self.request(
            "GET", "api/search", auth=("admin", "admin"), params={"type": "dash-db"}
        )

    def get_datasource(self, name):
        return self.request(
            "GET", f"api/datasources/name/{name}", auth=("admin", "admin")
        )

    def get_dashboard(self, uid):
        return self.request(
            "GET",
            f"api/dashboards/uid/{uid}",
            auth=("admin", "admin"),
        )
