"""This plugin collects MetalK8s ContainerD specific data.

There is some flags to enable/disable some specific data collection like
Pod logs.

NOTE: This plugin is used only on RedHat 8 based OS which mean it need to work
with sos 4.x and also with Python 3.6.
"""

from sos.report.plugins import Plugin, RedHatPlugin

# PluginOpt get added in sos 4.3 and must be used instead of
# simple tuple starting from there
try:
    from sos.report.plugins import PluginOpt

    HAS_PLUGIN_OPT = True
except ImportError:
    HAS_PLUGIN_OPT = False


class MetalK8sContainerd(Plugin, RedHatPlugin):

    """containerd engine"""

    plugin_name = "metalk8s_containerd"
    profiles = ("container",)
    packages = "cri-tools"

    _plugin_options = [
        {
            "name": "all",
            "default": False,
            "desc": "enable capture for all containers, even containers that have terminated",
        },
        {
            "name": "logs",
            "default": False,
            "desc": "capture logs for running containers",
        },
    ]
    if HAS_PLUGIN_OPT:
        option_list = [PluginOpt(**opt) for opt in _plugin_options]
    else:
        option_list = [
            (opt["name"], opt["desc"], "fast", opt["default"])
            for opt in _plugin_options
        ]

    def setup(self):
        """Prepare the data collection."""
        self.add_copy_spec(["/etc/containerd", "/etc/crictl.yaml"])
        self.add_copy_spec("/var/log/containers")

        subcmds = [
            "info",
            "images",
            "pods",
            "ps",
            "ps -a",
            "ps -v",
            "stats",
            "version",
        ]

        self.add_journal(units="containerd")
        self.add_cmd_output([f"crictl {s}" for s in subcmds])
        self.add_cmd_output("ls -alhR /etc/cni")

        ps_cmd = "crictl ps --quiet"
        if self.get_option("all"):
            ps_cmd = f"{ps_cmd} -a"

        img_cmd = "crictl images --quiet"
        pod_cmd = "crictl pods --quiet"

        containers = self._get_crio_list(ps_cmd)
        images = self._get_crio_list(img_cmd)
        pods = self._get_crio_list(pod_cmd)

        for container in containers:
            self.add_cmd_output(f"crictl inspect {container}")
            if self.get_option("logs"):
                self.add_cmd_output(f"crictl logs -t {container}")

        for image in images:
            self.add_cmd_output(f"crictl inspecti {image}")

        for pod in pods:
            self.add_cmd_output(f"crictl inspectp {pod}")

    def _get_crio_list(self, cmd):
        ret = []
        result = self.exec_cmd(cmd)
        if result["status"] == 0:
            for entry in result["output"].splitlines():
                if "deprecated" not in entry[0]:
                    # Prevent the socket deprecation warning
                    # from being iterated over
                    ret.append(entry)
        return ret
