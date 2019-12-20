#!/usr/bin/env python

import argparse
import os
import shutil
import socket

import yaml


def write_minion_id(args):
    if not os.path.isdir("/etc/salt"):
        os.makedirs("/etc/salt")

    with open("/etc/salt/minion_id", "w") as fp:
        fp.write("{}\n".format(args.minion_id))


def copy_ssh_identity(args):
    if args.copy_ssh_key is None:
        return

    if not os.path.exists(args.copy_ssh_key):
        raise ValueError("Path '{}' to SSH identity doesn't exist.".format(
            args.copy_ssh_key,
        ))

    if not os.path.isdir("/etc/salt/pki"):
        os.makedirs("/etc/salt/pki")

    shutil.copyfile(args.copy_ssh_key, "/etc/metalk8s/pki/salt-bootstrap")


def write_bootstrap_config(args):
    if not os.path.exists(args.output_file):
        os.makedirs(os.path.dirname(args.output_file))

    config_data = {
        "apiVersion": "metalk8s.scality.com/v1alpha2",
        "kind": "BootstrapConfiguration",
        "networks": {
            "controlPlane": control_plane_net,
            "workloadPlane": workload_plane_net,
        },
        "ca": {
            "minion": args.minion_id
        },
        "archives": [args.archive_path],
    }

    with open("/etc/metalk8s/bootstrap.yaml", "w") as fp:
        yaml.dump(config_data, fp, default_flow_style=False, sort_keys=True)


def build_parser():
    parser = argparse.ArgumentParser(
        description=(
            "Run this script to configure a Bootstrap node before installing "
            "MetalK8s."
        ),
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )

    parser.add_argument(
        "-c", "--control-plane-net",
        description="Subnet to use for the control plane"
    )
    parser.add_argument(
        "-w", "--workload-plane-net",
        description="Subnet to use for the workload plane"
    )

    hostname = socket.gethostname()
    parser.add_argument(
        "-i", "--minion-id",
        description="ID of the Salt minion on this Bootstrap node",
        default=hostname,
    )

    parser.add_argument(
        "--copy-ssh-key",
        description=(
            "SSH private key to copy into /etc/metalk8s/pki/salt-bootstrap "
            "for Salt master to use when expanding the cluster"
        ),
        default=None,
    )

    parser.add_argument(
        "-o", "--output-file",
        default="/etc/metalk8s/bootstrap.yaml",
        description="Path to the BootstrapConfiguration to write"
    )

    parser.add_argument(
        "-a", "--archive-path",
        default="/mnt/metalk8s.iso",
        description="Path to the MetalK8s ISO to install from"
    )

    return parser


def main():
    parser = build_parser()
    args = parser.parse_args()

    write_minion_id(args)
    copy_ssh_identity(args)
    write_bootstrap_config(args)


if __name__ == "__main__":
    main()
