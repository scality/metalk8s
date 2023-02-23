#!/usr/bin/env python3

import argparse
import netifaces
import os
import re
import subprocess
import yaml

import jinja2


EXPECTED_KIND = "KeepalivedConfiguration"
SUPPORTED_API_VERSION = ["metalk8s.scality.com/v1alpha1"]


def get_interface_from_ip(ip):
    # Check if the IP does not already sit on an interface (if yes then use it)
    for interface in netifaces.interfaces():
        for link in netifaces.ifaddresses(interface).get(netifaces.AF_INET) or []:
            if link.get("addr") == ip:
                return interface

    # NOTE: We do not have any easy way (without an external lib)
    # to retrieve the interface easily in Python
    # So let's rely on `ip route get`
    output = subprocess.check_output(f"ip route get {ip}", shell=True, text=True)

    match = re.search(r"^.+ dev (?P<iface>.+) src .+$", output, re.MULTILINE)
    return match.group("iface")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("-i", "--input", help="Data input file", required=True)
    parser.add_argument("-t", "--template", help=" Data template file", required=True)
    parser.add_argument(
        "-o", "--output", help="Output file (default stdout)", default="/dev/stdout"
    )
    args = parser.parse_args()

    with open(args.input, mode="r") as in_fd:
        input_data = yaml.safe_load(in_fd)

    if input_data["kind"] != EXPECTED_KIND:
        raise ValueError(
            f"Invalid kind '{input_data['kind']}' expected {EXPECTED_KIND}"
        )
    if input_data["apiVersion"] not in SUPPORTED_API_VERSION:
        raise ValueError(
            f"ApiVersion '{input_data['apiVersion']}' not supported, "
            f"expected one of {', '.join(SUPPORTED_API_VERSION)}"
        )

    environment = jinja2.Environment(loader=jinja2.FileSystemLoader("./"))
    temp = environment.get_template(args.template)
    temp.globals["get_interface_from_ip"] = get_interface_from_ip

    with open(args.output, mode="w", encoding="utf-8") as out_fd:
        out_fd.write(temp.render(input=input_data, env=os.environ))


if __name__ == "__main__":
    main()
