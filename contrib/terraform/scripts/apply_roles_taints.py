import argparse
import json
import subprocess

import yaml

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("-r", "--roles", nargs="*", default=[])
    parser.add_argument("-t", "--taints", nargs="*", default=[])
    parser.add_argument("node")

    args = parser.parse_args()

    node_str = subprocess.check_output([
        "kubectl",
        "--kubeconfig", "/etc/kubernetes/admin.conf",
        "get", "nodes", args.node,
        "--output", "json",
    ])
    node_dict = json.loads(node_str)

    desired_roles = {
        "node-role.kubernetes.io/{}".format(r) for r in args.roles
    }
    for label, value in node_dict["metadata"]["labels"].items():
        if label.startswith("node-role.kubernetes.io/"):
            if label in desired_roles:
                desired_roles.remove(label)
            else:
                subprocess.check_call([
                    "kubectl",
                    "--kubeconfig", "/etc/kubernetes/admin.conf",
                    "label", "node", args.node,
                    "{}-".format(label),
                ])
    for remaining in desired_roles:
        subprocess.check_call([
            "kubectl",
            "--kubeconfig", "/etc/kubernetes/admin.conf",
            "label", "node", args.node,
            "{}=''".format(remaining),
        ])

    desired_taints = {
        "node-role.kubernetes.io/{}".format(taint): {
            "key": "node-role.kubernetes.io/{}".format(taint),
            "value": "",
            "effect": "NoSchedule",
        }
        for taint in args.taints
    }
    for taint in node_dict["spec"].get("taints", []):
        if taint["key"] in desired_taints:
            desired_taints.pop(taint["key"])
        else:
            subprocess.check_call([
                "kubectl",
                "--kubeconfig", "/etc/kubernetes/admin.conf",
                "taint", "node", args.node,
                "{}-".format(taint["key"]),
            ])
    for remaining in desired_taints.values():
        subprocess.check_call([
            "kubectl",
            "--kubeconfig", "/etc/kubernetes/admin.conf",
            "taint", "node", args.node,
            "{t[key]}=:{t[effect]}".format(t=remaining),
        ])


if __name__ == "__main__":
    main()
