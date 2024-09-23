"""This plugin collects MetalK8s specific data.

There is some flags to enable/disable some specific data collection like
Kubernetes resources and Pod logs.

NOTE: This plugin is used only on RedHat 8 based OS which mean it need to work
with sos 4.x and also with Python 3.6.
"""

import contextlib
import json
import os

import requests

from sos.report.plugins import Plugin, RedHatPlugin

# PluginOpt get added in sos 4.3 and must be used instead of
# simple tuple starting from there
try:
    from sos.report.plugins import PluginOpt

    HAS_PLUGIN_OPT = True
except ImportError:
    HAS_PLUGIN_OPT = False


class MetalK8s(Plugin, RedHatPlugin):

    """Metalk8s plugin"""

    plugin_name = "metalk8s"
    short_desc = "MetalK8s platform"

    # Increase timeout since wee need to retrieve a lot of data
    # especially when all option enabled
    plugin_timeout = 3600

    packages = ("kubectl",)
    profiles = ("container",)

    files = ("/etc/kubernetes/admin.conf",)

    kube_cmd = "kubectl --kubeconfig=/etc/kubernetes/admin.conf"

    _plugin_options = [
        {
            "name": "k8s-resources",
            "default": False,
            "desc": "also collect all Kubernetes resources",
        },
        {
            "name": "resources-filter-out",
            "default": "",
            "desc": "filter out resources from the list of resources to collect (comma separated) "
            "(need k8s-resources to be enabled)",
        },
        {
            "name": "describe",
            "default": False,
            "desc": "capture descriptions of all kube resources (need k8s-resources to be enabled)",
        },
        {
            "name": "pod-logs",
            "default": False,
            "desc": "capture logs from pods (need k8s-resources to be enabled)",
        },
        {
            "name": "metrics",
            "default": False,
            "desc": "capture metrics from Prometheus",
        },
        {
            "name": "last",
            "default": "24h",
            "desc": "capture logs or/and metrics from the last defined time "
            "(need pod-logs or/and metrics to be enabled)",
        },
        {
            "name": "resolution",
            "default": "1h",
            "desc": "resolution of the metrics to capture (need metrics to be enabled)",
        },
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

    @staticmethod
    def _check_is_master():
        return any([os.path.exists("/etc/kubernetes/admin.conf")])

    @contextlib.contextmanager
    def _custom_collection_file(self, fname, subdir=None):
        """Helper that simulate sos collection_file method

        This is needed since this function does not exists in sos prior to 4.5
        """
        root_dir = self.get_cmd_output_path(make=False)
        dir_name = os.path.join(root_dir, subdir)

        os.makedirs(dir_name, exist_ok=True)

        # We truncate the filename to 255 characters since it's the max
        full_path = os.path.join(dir_name, fname[:255])

        with open(full_path, "a", encoding="utf-8") as _file:
            yield _file

    def _setup_common(self):
        # Add Kubernetes specific files
        self.add_copy_spec("/etc/kubernetes/manifests")

        # Add MetalK8s specific files
        self.add_copy_spec("/etc/metalk8s")
        self.add_forbidden_path(["/etc/metalk8s/pki", "/etc/metalk8s/crypt"])
        self.add_copy_spec("/etc/salt")
        self.add_forbidden_path("/etc/salt/pki")
        self.add_copy_spec("/var/log/metalk8s")

        services = [
            "kubelet",
            "salt-minion",
        ]

        for service in services:
            self.add_journal(units=service)

    def _setup_k8s_resources(
        self,
    ):  # pylint: disable=too-many-statements,too-many-locals
        root_dir = self.get_cmd_output_path(make=False)
        flat_dir = "flat"

        ns_kind = {}
        no_ns_kind = set()

        def _add_symlink(relative_dest, src_path, dest_name):
            dest_dir = os.path.join(root_dir, relative_dest)
            dest = os.path.join(dest_dir, dest_name)

            os.makedirs(dest_dir, exist_ok=True)

            if os.path.lexists(dest):
                # NOTE: If symlink already exists it means we have 2 objects with
                # the same name. It's the case for events for example
                return

            src = os.path.join("../" * len(relative_dest.split(os.sep)), src_path)
            os.symlink(src, dest)

        def _handle_symlinks(src_name, dest_name, kind, namespace=None):
            """Handle symlinks for a specific file

            For every files we create, we also create a symlinks
            to group resources per kind and namespace.
            """
            src_path = os.path.join(flat_dir, src_name)

            # Handle by namespace
            relative_dest = os.path.join(
                "by-namespaces", namespace or "_no_namespace", kind
            )
            _add_symlink(relative_dest, src_path, dest_name)

            # Handle by kind
            relative_dest = os.path.join("by-resources", kind)
            if namespace:
                relative_dest = os.path.join(relative_dest, namespace)
            _add_symlink(relative_dest, src_path, dest_name)

        def _handle_global():
            for kind, namespaces in ns_kind.items():
                for namespace in namespaces:
                    filename = f"{kind}_ns_{namespace}_list.txt"
                    self.add_cmd_output(
                        f"{self.kube_cmd} get --namespace={namespace} {kind}",
                        subdir=flat_dir,
                        suggest_filename=filename,
                    )

                    _handle_symlinks(
                        src_name=filename,
                        dest_name="list.txt",
                        kind=kind,
                        namespace=namespace,
                    )

                    if kind == "pod":
                        filename = f"{kind}_ns_{namespace}_top.txt"
                        self.add_cmd_output(
                            f"{self.kube_cmd} top --namespace={namespace} {kind}",
                            subdir=flat_dir,
                            suggest_filename=filename,
                        )

                        _handle_symlinks(
                            src_name=filename,
                            dest_name="top.txt",
                            kind=kind,
                            namespace=namespace,
                        )

            for kind in no_ns_kind:
                filename = f"{kind}_list.txt"
                self.add_cmd_output(
                    f"{self.kube_cmd} get {kind}",
                    subdir=flat_dir,
                    suggest_filename=filename,
                )

                _handle_symlinks(src_name=filename, dest_name="list.txt", kind=kind)

                if kind == "node":
                    filename = f"{kind}_top.txt"
                    self.add_cmd_output(
                        f"{self.kube_cmd} top {kind}",
                        subdir=flat_dir,
                        suggest_filename=filename,
                    )

                    _handle_symlinks(src_name=filename, dest_name="top.txt", kind=kind)

        def _handle_describe(prefix, obj):
            cmd = f"{self.kube_cmd} describe {obj['kind']} {obj['metadata']['name']}"
            if obj["metadata"].get("namespace"):
                cmd += " --namespace=" + obj["metadata"]["namespace"]

            self.add_cmd_output(
                cmd,
                subdir=flat_dir,
                suggest_filename=f"{prefix}_describe.txt",
            )
            _handle_symlinks(
                src_name=f"{prefix}_describe.txt",
                dest_name=f"{obj['metadata']['name']}_describe.txt",
                kind=obj["kind"].lower(),
                namespace=obj["metadata"].get("namespace"),
            )

        def _handle_pod_logs(prefix, obj):
            cmd = (
                f"{self.kube_cmd} logs --all-containers --timestamps "
                f"--since={self.get_option('last')} "
                f"--namespace={obj['metadata']['namespace']} {obj['metadata']['name']}"
            )
            self.add_cmd_output(
                cmd, subdir=flat_dir, suggest_filename=f"{prefix}_logs.txt"
            )
            _handle_symlinks(
                src_name=f"{prefix}_logs.txt",
                dest_name=f"{obj['metadata']['name']}_logs.txt",
                kind=obj["kind"].lower(),
                namespace=obj["metadata"]["namespace"],
            )

            # If the Pod has some restarts, we also capture the previous logs
            for container in obj.get("status", {}).get("containerStatuses", []):
                if container.get("restartCount", 0):
                    self.add_cmd_output(
                        cmd + " --previous",
                        subdir=flat_dir,
                        suggest_filename=f"{prefix}_logs_previous.txt",
                    )
                    _handle_symlinks(
                        src_name=f"{prefix}_logs_previous.txt",
                        dest_name=f"{obj['metadata']['name']}_logs_previous.txt",
                        kind=obj["kind"].lower(),
                        namespace=obj["metadata"]["namespace"],
                    )
                    break

        def _handle_obj(obj):
            obj_kind = obj["kind"].lower()
            obj_name = obj["metadata"]["name"]
            obj_namespace = obj["metadata"].get("namespace")
            suffix = "get"

            # Store every type and namespace we encounter
            # to retrieve list at the end
            if obj_namespace:
                ns_kind.setdefault(obj_kind, set()).add(obj_namespace)
            else:
                no_ns_kind.add(obj_kind)

            if obj_kind == "event":
                obj_kind = obj["involvedObject"]["kind"].lower()
                obj_name = obj["involvedObject"]["name"]
                obj_namespace = obj["involvedObject"].get("namespace")
                suffix = "event"

            prefix = (
                f"{obj_kind}_{f'ns_{obj_namespace}' if obj_namespace else ''}{obj_name}"
            )

            with self._custom_collection_file(
                f"{prefix}_{suffix}.json", subdir=flat_dir
            ) as obj_file:
                obj_file.write(json.dumps(obj, indent=4))

            _handle_symlinks(
                src_name=f"{prefix}_{suffix}.json",
                dest_name=f"{obj_name}_{suffix}.json",
                kind=obj_kind,
                namespace=obj_namespace,
            )

            if obj["kind"] not in ["Event"] and self.get_option("describe"):
                _handle_describe(prefix, obj)

            if obj["kind"] == "Pod" and self.get_option("pod-logs"):
                _handle_pod_logs(prefix, obj)

        # Retrieve Kubernetes resources types
        ns_resources = set(
            self.exec_cmd(
                f"{self.kube_cmd} api-resources --verbs=list --namespaced=true -o name"
            )["output"].splitlines()
        )
        no_ns_resources = set(
            self.exec_cmd(
                f"{self.kube_cmd} api-resources --verbs=list --namespaced=false -o name"
            )["output"].splitlines()
        )

        # Remove sensitive resources
        ns_resources = ns_resources.difference(
            ["events.events.k8s.io", "secrets"]
            + (self.get_option("resources-filter-out") or "").split(",")
        )
        no_ns_resources = no_ns_resources.difference(
            (self.get_option("resources-filter-out") or "").split(",")
        )

        # Retrieve all objects at once
        # NOTE: We retrieve all object at once since retrieving resource
        # one by one is not efficient (too many calls to the APIServer)
        all_ns_obj = json.loads(
            self.exec_cmd(
                f"{self.kube_cmd} get --all-namespaces {','.join(ns_resources)} --output=json",
                stderr=False,
            )["output"]
        )["items"]
        all_no_ns_obj = json.loads(
            self.exec_cmd(
                f"{self.kube_cmd} get {','.join(no_ns_resources)} --output=json",
                stderr=False,
            )["output"]
        )["items"]

        for obj in all_ns_obj:
            _handle_obj(obj)

        for obj in all_no_ns_obj:
            _handle_obj(obj)

        _handle_global()

    def _setup_metrics(self):
        prom_svc = json.loads(
            self.exec_cmd(
                f"{self.kube_cmd} get svc -n metalk8s-monitoring thanos-query-http -o json"
            )["output"]
        )

        prom_endpoint = f"http://{prom_svc['spec']['clusterIP']}:{prom_svc['spec']['ports'][0]['port']}"  # pylint: disable=line-too-long

        # Retrieve 1 point every <resolution> time for the last <last> time
        query_range = f"{self.get_option('last')}:{self.get_option('resolution')}"

        # Retrieve all metrics
        # NOTE: Retrieving all metrics at once is not efficient since it
        # cause Thanos/Prometheus pods to consume a lot of CPU and memory
        # and can cause the API to be unavailable.
        # We retrieve metrics one by one to avoid this issue.
        try:
            metrics_res = requests.get(f"{prom_endpoint}/api/v1/label/__name__/values")
        except requests.exceptions.ConnectionError as exc:
            self._log_error(f"Unable to connect to Prometheus API: {exc}")
            return

        try:
            metrics_res.raise_for_status()
        except requests.exceptions.HTTPError as exc:
            self._log_error(f"An error occurred while querying Prometheus API: {exc}")
            return

        try:
            metrics = metrics_res.json()["data"]
        except ValueError as exc:
            self._log_error(
                f"Invalid JSON returned by Prometheus API: {exc} {metrics_res.text}"
            )
            return

        for metric in metrics:
            try:
                res = requests.get(
                    f"{prom_endpoint}/api/v1/query",
                    params={"query": f"{metric}[{query_range}]"},
                )
            except requests.exceptions.ConnectionError as exc:
                self._log_error(
                    f"Unable to connect to Prometheus API for metric {metric}: {exc}"
                )
                continue

            try:
                res.raise_for_status()
            except requests.exceptions.HTTPError as exc:
                self._log_error(
                    f"An error occurred while retrieving the metric {metric}: {exc}"
                )
                continue

            try:
                res_json = res.json()
            except ValueError as exc:
                self._log_error(
                    f"Invalid JSON returned for metric {metric}: {exc} {res.text}"
                )
                continue

            with self._custom_collection_file(
                f"{metric}.json", subdir="metrics"
            ) as metric_file:
                metric_file.write(json.dumps(res_json, indent=4))

    def _prometheus_snapshot(self):
        kube_cmd = (
            "kubectl "
            "--kubeconfig=/etc/kubernetes/admin.conf "
            "--namespace metalk8s-monitoring"
        )

        # Retrieve Prometheus endpoint
        prom_endpoint_cmd = (
            f"{kube_cmd} get endpoints "
            "prometheus-operator-prometheus --output "
            "jsonpath='{{ .subsets[0].addresses[0].targetRef.name }} "
            "{{ .subsets[0].addresses[0].ip }}:"
            "{{ .subsets[0].ports[0].port }}'"
        )
        prom_endpoint_res = self.exec_cmd(prom_endpoint_cmd)
        prom_instance, prom_endpoint = prom_endpoint_res["output"].split()

        # Generate snapshot
        # return a JSON object as follows:
        # {"status":"success","data":{"name":"20210322T164646Z-7d0b9ca8be8e9981"}}
        # or in case of error:
        # {"status":"error","errorType":"unavailable","error":"admin APIs disabled"}
        prom_snapshot_url = f"http://{prom_endpoint}/api/v1/admin/tsdb/snapshot"
        res = requests.post(prom_snapshot_url)
        try:
            res.raise_for_status()
        except requests.exceptions.HTTPError as exc:
            self._log_error(f"An error occurred while querying Prometheus API: {exc}")
            return

        try:
            res_json = res.json()
        except ValueError as exc:
            self._log_error(
                f"Invalid JSON returned by Prometheus API: {exc} {res.text}"
            )
            return

        try:
            snapshot_name = res_json["data"]["name"]
        except KeyError:
            self._log_error(
                f"Unable to generate Prometheus snapshot: {res_json['error']}"
            )
            return

        # Copy snapshot locally
        snapshot_archive_dir = f"{self.archive.get_archive_path()}/prometheus-snapshot"

        copy_snapshot_cmd = (
            f"{kube_cmd} cp -c prometheus {prom_instance}:/prometheus/snapshots/{snapshot_name}"
            f" {snapshot_archive_dir}"
        )
        self.exec_cmd(copy_snapshot_cmd)

        # Remove snapshot from Prometheus pod
        delete_snapshot_cmd = (
            f"{kube_cmd} exec -c prometheus {prom_instance} -- "
            f"rm -rf /prometheus/snapshots/{snapshot_name}"
        )
        self.exec_cmd(delete_snapshot_cmd)

    def setup(self):
        """Prepare the data collection."""
        self._setup_common()

        # We can only grab kubectl output from the master
        if self._check_is_master():
            if self.get_option("k8s-resources"):
                self._setup_k8s_resources()

            if self.get_option("metrics"):
                self._setup_metrics()

            if self.get_option("prometheus-snapshot"):
                self._prometheus_snapshot()
