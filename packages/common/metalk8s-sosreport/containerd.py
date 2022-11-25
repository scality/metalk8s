#! /bin/env python3

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


class containerd(Plugin, RedHatPlugin):

    """containerd engine"""

    plugin_name = "containerd"
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
        self.add_cmd_output(["crictl {}".format(s) for s in subcmds])
        self.add_cmd_output("ls -alhR /etc/cni")

        ps_cmd = "crictl ps --quiet"
        if self.get_option("all"):
            ps_cmd = "{} -a".format(ps_cmd)

        img_cmd = "crictl images --quiet"
        pod_cmd = "crictl pods --quiet"

        containers = self._get_crio_list(ps_cmd)
        images = self._get_crio_list(img_cmd)
        pods = self._get_crio_list(pod_cmd)

        for container in containers:
            self.add_cmd_output("crictl inspect {}".format(container))
            if self.get_option("logs"):
                self.add_cmd_output("crictl logs -t {}".format(container))

        for image in images:
            self.add_cmd_output("crictl inspecti {}".format(image))

        for pod in pods:
            self.add_cmd_output("crictl inspectp {}".format(pod))

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
