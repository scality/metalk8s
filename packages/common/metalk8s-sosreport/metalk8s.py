"""This plugin collects MetalK8s specific data.

There is some flags to enable/disable some specific data collection like
Kubernetes resources and Pod logs.

NOTE: This plugin is used on different OS including CentOs 7 and Rocky 8
which mean it need to work with both sos 3.x and sos 4.x and also with
Python 2.7 and Python 3.6.
"""

import contextlib
import json
import os

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


class MetalK8s(Plugin, RedHatPlugin):

    """Metalk8s plugin"""

    plugin_name = "metalk8s"
    short_desc = "MetalK8s platform"

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
            "name": "last",
            "default": "24h",
            "desc": "capture logs from the last defined time (need pod-logs to be enabled)",
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

        if not os.path.exists(dir_name):
            # NOTE: We cannot use `exist_ok=True` since it's not available in Python 2.7
            os.makedirs(dir_name)

        # We truncate the filename to 255 characters since it's the max
        full_path = os.path.join(dir_name, fname[:255])

        with open(full_path, "a") as _file:
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

    def _setup_k8s_resources(self):  # pylint: disable=too-many-statements
        root_dir = self.get_cmd_output_path(make=False)
        flat_dir = "flat"

        def _add_symlink(relative_dest, src_path, dest_name):
            dest_dir = os.path.join(root_dir, relative_dest)
            dest = os.path.join(dest_dir, dest_name)

            if not os.path.exists(dest_dir):
                # NOTE: We cannot use `exist_ok=True` since it's not available in Python 2.7
                os.makedirs(dest_dir)

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

        def _handle_describe(prefix, obj):
            cmd = "{} describe {} {}".format(
                self.kube_cmd,
                obj["kind"],
                obj["metadata"]["name"],
            )
            if obj["metadata"].get("namespace"):
                cmd += " --namespace=" + obj["metadata"]["namespace"]

            self.add_cmd_output(
                cmd,
                subdir=flat_dir,
                suggest_filename="{}_describe.txt".format(prefix),
            )
            _handle_symlinks(
                src_name="{}_describe.txt".format(prefix),
                dest_name="{}_describe.txt".format(obj["metadata"]["name"]),
                kind=obj["kind"].lower(),
                namespace=obj["metadata"].get("namespace"),
            )

        def _handle_pod_logs(prefix, obj):
            cmd = "{} logs --all-containers --timestamps --since={} --namespace={} {}".format(
                self.kube_cmd,
                self.get_option("last"),
                obj["metadata"]["namespace"],
                obj["metadata"]["name"],
            )
            self.add_cmd_output(
                cmd, subdir=flat_dir, suggest_filename="{}_logs.txt".format(prefix)
            )
            _handle_symlinks(
                src_name="{}_logs.txt".format(prefix),
                dest_name="{}_logs.txt".format(obj["metadata"]["name"]),
                kind=obj["kind"].lower(),
                namespace=obj["metadata"]["namespace"],
            )

            # If the Pod has some restarts, we also capture the previous logs
            for container in obj.get("status", {}).get("containerStatuses", []):
                if container.get("restartCount", 0):
                    self.add_cmd_output(
                        cmd + " --previous",
                        subdir=flat_dir,
                        suggest_filename="{}_logs_previous.txt".format(prefix),
                    )
                    _handle_symlinks(
                        src_name="{}_logs_previous.txt".format(prefix),
                        dest_name="{}_logs_previous.txt".format(
                            obj["metadata"]["name"]
                        ),
                        kind=obj["kind"].lower(),
                        namespace=obj["metadata"]["namespace"],
                    )
                    break

        def _handle_obj(obj):
            obj_kind = obj["kind"].lower()
            obj_name = obj["metadata"]["name"]
            obj_namespace = obj["metadata"].get("namespace")
            suffix = "get"

            if obj_kind == "event":
                obj_kind = obj["involvedObject"]["kind"].lower()
                obj_name = obj["involvedObject"]["name"]
                obj_namespace = obj["involvedObject"].get("namespace")
                suffix = "event"

            prefix = "{}_{}{}".format(
                obj_kind,
                "ns_{}_".format(obj_namespace) if obj_namespace else "",
                obj_name,
            )

            with self._custom_collection_file(
                "{}_{}.json".format(prefix, suffix), subdir=flat_dir
            ) as obj_file:
                obj_file.write(json.dumps(obj, indent=4))

            _handle_symlinks(
                src_name="{}_{}.json".format(prefix, suffix),
                dest_name="{}_{}.json".format(obj_name, suffix),
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
                "{} api-resources --verbs=list --namespaced=true -o name".format(
                    self.kube_cmd
                )
            )["output"].splitlines()
        )
        no_ns_resources = set(
            self.exec_cmd(
                "{} api-resources --verbs=list --namespaced=false -o name".format(
                    self.kube_cmd
                )
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
                "{} get --all-namespaces {} --output=json".format(
                    self.kube_cmd, ",".join(ns_resources)
                ),
                stderr=False,
            )["output"]
        )["items"]
        all_no_ns_obj = json.loads(
            self.exec_cmd(
                "{} get {} --output=json".format(
                    self.kube_cmd, ",".join(no_ns_resources)
                ),
                stderr=False,
            )["output"]
        )["items"]

        for obj in all_ns_obj:
            _handle_obj(obj)

        for obj in all_no_ns_obj:
            _handle_obj(obj)

    def _prometheus_snapshot(self):
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
                "Invalid JSON returned by Prometheus API: {} {}".format(exc, res.text)
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
        """Prepare the data collection."""
        self._setup_common()

        # We can only grab kubectl output from the master
        if self._check_is_master():
            if self.get_option("k8s-resources"):
                self._setup_k8s_resources()

            if self.get_option("prometheus-snapshot"):
                self._prometheus_snapshot()
