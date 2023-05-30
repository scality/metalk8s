#!/usr/bin/env python3

"""
Utility script to read and write Prometheus Alert rules to file.
Ensures we can test the Alert rules deployed and for documentation
purposes.
"""

import argparse
import ipaddress
import json
import pathlib
import requests
import subprocess
import sys


def query_prometheus_api(ip, port, route):
    """Read the Prometheus route contents into memory."""
    if not route:
        sys.stderr.write("Expected endpoint route but got {}".format(route))
        sys.exit(1)

    endpoint = "https://{}:{}/api/prometheus/api/v1/{}".format(ip, port, route)
    try:
        response = requests.get(url=endpoint, verify=False)
    except requests.exceptions.ConnectionError as exc:
        sys.stderr.write("Failed to reach endpoint {}: {!s}".format(route, exc))
        sys.exit(1)

    if response.status_code != 200:
        sys.stderr.write(
            "Expected status code <200> got {}".format(response.status_code)
        )
        sys.exit(1)

    return response.json()


def write_json_to_file(content, rule_name, output_dir):
    filename = "{}.json".format(rule_name)
    filepath = output_dir / filename
    try:
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(content, f, indent=4, sort_keys=True)
    except IOError as exc:
        sys.stderr.write("Failed to write json file: {!s}".format(exc))
        sys.exit(1)


def main():
    """
    python rule_extractor --ip 127.0.0.1 --port 9090 -t rules
    """
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "-i",
        "--ip",
        dest="ip",
        help="Specify the target control-plane ingress IP address",
    )
    parser.add_argument(
        "-p",
        "--port",
        dest="port",
        default="8443",
        help="Specify the target control-plane ingress port",
        type=int,
    )
    parser.add_argument(
        "-t",
        required=True,
        dest="object_type",
        help="Specify the type of objects to fetch",
        choices=["rules"],
    )
    parser.add_argument(
        "-o",
        "--output",
        type=pathlib.Path,
        default=pathlib.Path(__file__).parent,
        help="Output directory for JSON files",
    )

    args = parser.parse_args()
    if args.ip:
        ip = args.ip
    else:
        # Obtain VM ip by connecting to it and running a command
        # Requires that the VM is up and running.
        ip = (
            subprocess.check_output(
                ["vagrant", "ssh", "--command", "hostname -I | cut -d' ' -f1"]
            )
            .decode(sys.stdout.encoding)
            .strip()
        )
    # Validate that we got a real ipv4 address
    try:
        ipaddress.IPv4Address(ip)
    except ValueError:
        sys.stderr.write("Ip address: {} is invalid".format(ip))
        sys.exit(1)

    if args.object_type == "rules":
        result = query_prometheus_api(ip=ip, port=args.port, route="rules")
        write_json_to_file(result, "rules", args.output)
        rule_group = result.get("data", {}).get("groups", [])
        recording_rules = []
        alerting_rules = []
        for item in rule_group:
            for rule in item.get("rules", []):
                # rule type can be alerting or recording
                # For now, we only need alerting rules
                if rule["type"] == "alerting":
                    message = (
                        rule["annotations"].get("message")
                        or rule["annotations"].get("summary")
                        or rule["annotations"].get("description")
                    )
                    fixup_alerting_rule = {
                        "name": rule["name"],
                        "severity": rule["labels"]["severity"],
                        "message": message,
                        "query": rule["query"],
                    }
                    alerting_rules.append(fixup_alerting_rule)

                elif rule["type"] == "recording":
                    fixup_record_rules = {"name": rule["name"], "query": rule["query"]}
                    recording_rules.append(fixup_record_rules)

        write_json_to_file(alerting_rules, "alerting_rules", args.output)
    else:
        sys.stderr.write("Input argument {} is unsupported".format(args.object_type))
        sys.exit(1)


if __name__ == "__main__":
    main()
