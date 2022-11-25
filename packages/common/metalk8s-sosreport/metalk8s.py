#! /bin/env python3

from os import path

import requests

HAS_PLUGIN_OPT = False

# sos plugin layout changed in sos 4.0
try:
    from sos.report.plugins import Plugin, RedHatPlugin

    # PluginOpt get added in sos 4.3 and must be used instead of
    # simple tuple starting from there
    try:
        from sos.report.plugins import PluginOpt

        HAS_PLUGIN_OPT = True
    except ImportError:
        pass
except ImportError:
    from sos.plugins import Plugin, RedHatPlugin


class metalk8s(Plugin, RedHatPlugin):

    """Metalk8s plugin"""

    plugin_name = "metalk8s"
    packages = ("kubernetes", "kubernetes-master")
    profiles = ("container",)
    files = ("/etc/kubernetes/admin.conf",)

    _plugin_options = [
        {
            "name": "all",
            "default": False,
            "desc": "also collect all namespaces output separately",
        },
        {
            "name": "describe",
            "default": False,
            "desc": "capture descriptions of all kube resources",
        },
        {"name": "podlogs", "default": False, "desc": "capture logs for pods"},
        {
            "name": "prometheus-snapshot",
            "default": False,
            "desc": "generate a Prometheus snapshot",
        },
    ]
    if HAS_PLUGIN_OPT:
        option_list = [PluginOpt(**opt) for opt in _plugin_options]
    else:
        option_list = [
            (opt["name"], opt["desc"], "fast", opt["default"])
            for opt in _plugin_options
        ]

    def check_is_master(self):
        return any([path.exists("/etc/kubernetes/admin.conf")])

    def prometheus_snapshot(self):
        kube_cmd = (
            "kubectl "
            "--kubeconfig=/etc/kubernetes/admin.conf "
            "--namespace metalk8s-monitoring"
        )

        # Retrieve Prometheus endpoint
        prom_endpoint_cmd = (
            "{0} get endpoints "
            "prometheus-operator-prometheus --output "
            "jsonpath='{{ .subsets[0].addresses[0].targetRef.name }} "
            "{{ .subsets[0].addresses[0].ip }}:"
            "{{ .subsets[0].ports[0].port }}'".format(kube_cmd)
        )
        prom_endpoint_res = self.exec_cmd(prom_endpoint_cmd)
        prom_instance, prom_endpoint = prom_endpoint_res["output"].split()

        # Generate snapshot
        # return a JSON object as follows:
        # {"status":"success","data":{"name":"20210322T164646Z-7d0b9ca8be8e9981"}}
        # or in case of error:
        # {"status":"error","errorType":"unavailable","error":"admin APIs disabled"}
        prom_snapshot_url = "http://{0}/api/v1/admin/tsdb/snapshot".format(
            prom_endpoint
        )
        res = requests.post(prom_snapshot_url)
        try:
            res.raise_for_status()
        except requests.exceptions.HTTPError as exc:
            self._log_error(
                "An error occurred while querying Prometheus API: {0}".format(str(exc))
            )
            return

        try:
            res_json = res.json()
        except ValueError as exc:
            self._log_error(
                "Invalid JSON returned by Prometheus API: {0}".format(res.text)
            )
            return

        try:
            snapshot_name = res_json["data"]["name"]
        except KeyError:
            self._log_error(
                "Unable to generate Prometheus snapshot: {0}".format(res_json["error"])
            )
            return

        # Copy snapshot locally
        snapshot_archive_dir = "{0}/prometheus-snapshot".format(
            self.archive.get_archive_path()
        )

        copy_snapshot_cmd = (
            "{0} cp -c prometheus {1}:/prometheus/snapshots/{2} {3}".format(
                kube_cmd, prom_instance, snapshot_name, snapshot_archive_dir
            )
        )
        self.exec_cmd(copy_snapshot_cmd)

        # Remove snapshot from Prometheus pod
        delete_snapshot_cmd = (
            "{0} exec -c prometheus {1} -- "
            "rm -rf /prometheus/snapshots/{2}".format(
                kube_cmd, prom_instance, snapshot_name
            )
        )
        self.exec_cmd(delete_snapshot_cmd)

    def setup(self):
        self.add_copy_spec("/etc/kubernetes/manifests")
        self.add_copy_spec("/etc/metalk8s/bootstrap.yaml")
        self.add_copy_spec("/etc/metalk8s/solutions.yaml")
        self.add_copy_spec("/etc/salt")
        self.add_forbidden_path("/etc/salt/pki")
        self.add_copy_spec("/var/log/pods")
        self.add_copy_spec("/var/log/metalk8s")

        services = [
            "kubelet",
            "salt-minion",
        ]

        for service in services:
            self.add_journal(units=service)

        # We can only grab kubectl output from the master
        if self.check_is_master():
            kube_cmd = "kubectl "
            if path.exists("/etc/kubernetes/admin.conf"):
                kube_cmd += "--kubeconfig=/etc/kubernetes/admin.conf"

            kube_get_cmd = "get -o json "
            for subcmd in ["version", "config view", "top nodes"]:
                self.add_cmd_output("{0} {1}".format(kube_cmd, subcmd))

            # get all namespaces in use
            namespaces_result = self.exec_cmd(
                "{0} get namespaces --no-headers "
                "--output custom-columns=':metadata.name'".format(kube_cmd)
            )
            kube_namespaces = namespaces_result["output"].splitlines()

            resources = [
                "pods",
                "deploy",
                "rc",
                "services",
                "ds",
                "cm",
            ]

            # nodes and pvs are not namespaced, must pull separately.
            # Also collect master metrics
            self.add_cmd_output(
                [
                    "{} get -o json nodes".format(kube_cmd),
                    "{} get -o json pv".format(kube_cmd),
                    "{} get --raw /metrics".format(kube_cmd),
                ]
            )

            for n in kube_namespaces:
                kube_namespace = "--namespace={}".format(n)
                if self.get_option("all"):
                    kube_namespaced_cmd = "{0} {1} {2}".format(
                        kube_cmd, kube_get_cmd, kube_namespace
                    )

                    for subcmd in ["events", "top pods"] + resources:
                        self.add_cmd_output(
                            "{0} {1}".format(kube_namespaced_cmd, subcmd)
                        )

                if self.get_option("describe"):
                    # need to drop json formatting for this
                    kube_namespaced_cmd = "{0} get {1}".format(kube_cmd, kube_namespace)
                    for res in resources:
                        self.add_cmd_output("{0} {1}".format(kube_namespaced_cmd, res))

                        r = self.exec_cmd(
                            "{0} {1} --no-headers "
                            "--output custom-colums=':metadata.name'".format(
                                kube_namespaced_cmd, res
                            )
                        )
                        if r["status"] == 0:
                            for k in r["output"].splitlines():
                                kube_namespaced_cmd = "{0} {1}".format(
                                    kube_cmd, kube_namespace
                                )
                                self.add_cmd_output(
                                    "{0} describe {1} {2}".format(
                                        kube_namespaced_cmd, res, k
                                    )
                                )

                if self.get_option("podlogs"):
                    kube_namespaced_cmd = "{0} {1}".format(kube_cmd, kube_namespace)
                    r = self.exec_cmd(
                        "{} get pods --no-headers --output "
                        "custom-columns=':metadata.name'".format(kube_namespaced_cmd)
                    )
                    if r["status"] == 0:
                        for pod in r["output"].splitlines():
                            self.add_cmd_output(
                                "{0} logs {1} --all-containers".format(
                                    kube_namespaced_cmd, pod
                                )
                            )

            if not self.get_option("all"):
                kube_namespaced_cmd = "{} get --all-namespaces=true".format(kube_cmd)
                for res in resources:
                    self.add_cmd_output("{0} {1}".format(kube_namespaced_cmd, res))

            if self.get_option("prometheus-snapshot"):
                self.prometheus_snapshot()

    def postproc(self):
        # First, clear sensitive data from the json output collected.
        # This will mask values when the 'name' looks susceptible of
        # values worth obfuscating, i.e. if the name contains strings
        # like 'pass', 'pwd', 'key' or 'token'
        env_regexp = (
            r'(?P<var>{\s*"name":\s*[^,]*'
            r'(pass|pwd|key|token|cred|PASS|PWD|KEY)[^,]*,\s*"value":)[^}]*'
        )
        self.do_cmd_output_sub("kubectl", env_regexp, r'\g<var> "********"')
        # Next, we need to handle the private keys and certs in some
        # output that is not hit by the previous iteration.
        self.do_cmd_private_sub("kubectl")
