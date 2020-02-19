#!/usr/bin/env python

import argparse
import errno
import os
import shutil
import socket

import yaml


def makedirs(path):
    try:
        os.makedirs(path)
    except OSError as exc:
        if exc.errno == errno.EEXIST:
            pass


def write_minion_id(args):
    makedirs("/etc/salt")

    with open("/etc/salt/minion_id", "w") as fp:
        fp.write("{}\n".format(args.minion_id))


def copy_ssh_identity(args):
    if args.copy_ssh_key is None:
        return

    if not os.path.exists(args.copy_ssh_key):
        raise ValueError("Path '{}' to SSH identity doesn't exist.".format(
            args.copy_ssh_key,
        ))

    makedirs("/etc/metalk8s/pki")
    shutil.copyfile(args.copy_ssh_key, "/etc/metalk8s/pki/salt-bootstrap")


def write_bootstrap_config(args):
    makedirs(os.path.dirname(args.output_file))

    config_data = {
        "apiVersion": "metalk8s.scality.com/v1alpha2",
        "kind": "BootstrapConfiguration",
        "networks": {
            "controlPlane": args.control_plane_net,
            "workloadPlane": args.workload_plane_net,
        },
        "ca": {
            "minion": args.minion_id
        },
        "archives": [args.archive_path],
    }

    with open("/etc/metalk8s/bootstrap.yaml", "w") as fp:
        yaml.dump(config_data, fp, default_flow_style=False)


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
        help="Subnet to use for the control plane"
    )
    parser.add_argument(
        "-w", "--workload-plane-net",
        help="Subnet to use for the workload plane"
    )

    hostname = socket.gethostname()
    parser.add_argument(
        "-i", "--minion-id",
        help="ID of the Salt minion on this Bootstrap node",
        default=hostname,
    )

    parser.add_argument(
        "--copy-ssh-key",
        help=(
            "SSH private key to copy into /etc/metalk8s/pki/salt-bootstrap "
            "for Salt master to use when expanding the cluster"
        ),
        default=None,
    )

    parser.add_argument(
        "-o", "--output-file",
        default="/etc/metalk8s/bootstrap.yaml",
        help="Path to the BootstrapConfiguration to write"
    )

    parser.add_argument(
        "-a", "--archive-path",
        default="/mnt/metalk8s.iso",
        help="Path to the MetalK8s ISO to install from"
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
