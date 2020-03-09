#!/usr/bin/env python

import argparse
import json
import subprocess
import sys
import time


def get_nodes(node_names):
    cmd = ['kubectl', 'get', 'nodes', '-o', 'json']
    cmd.extend(node_names)
    result = subprocess.check_output(cmd)
    if len(node_names) == 1:
        return [json.loads(result)]
    return json.loads(result)['items']


def should_wait(node):
    conditions = node['status'].get('conditions', [])
    if (
        not conditions
        or not all(c['status'] for c in conditions if c['type'] == 'Ready')
    ):
        return True

    if node['spec'].get('unschedulable', False):
        return True

    taints = node['spec'].get('taints', [])
    if any(t['key'] == 'node.kubernetes.io/unschedulable' for t in taints):
        return True

    return False


def print_status(nodes, retries, wait):
    print('Waiting for nodes ({}s): {}'.format(
        retries * wait,
        ", ".join(
            n['metadata']['name'] for n in filter(should_wait, nodes)
        )
    ))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('-n', '--node', action='append', dest='node_names',
                        default=[])
    parser.add_argument('--retry', type=int, dest='max_retries', default=30)
    parser.add_argument('--wait', type=int, dest='wait_time', default=10)

    args = parser.parse_args()

    found_nodes = get_nodes(args.node_names)
    retries = 0
    while (
        any(map(should_wait, found_nodes))
        and retries < args.max_retries
    ):
        print_status(found_nodes, retries, args.wait_time)
        time.sleep(args.wait_time)
        found_nodes = get_nodes(args.node_names)
        retries += 1

    not_ready = [node for node in found_nodes if should_wait(node)]
    if not_ready:
        print('Some nodes are still not ready after {}s: {}'.format(
            args.max_retries * args.wait_time,
            ", ".join(n['metadata']['name'] for n in not_ready)
        ))
        print('Exiting.')
        sys.exit(1)
    else:
        if args.node_names:
            print('Selected nodes ({}) are running!'.format(
                ", ".join(args.node_names)
            ))
        else:
            print('All nodes are running!')
        sys.exit(0)


if __name__ == "__main__":
    main()
