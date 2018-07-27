import os
import os.path
import sys
import copy
import json

import yaml

DEFAULT_SOURCE = 'DS_DUMMY'


def is_dashboard(dashboard):
    return all([
        'annotations' in dashboard,
        'rows' in dashboard,
    ])


def main(dashboard_data, output, filename, title=None):
    name = os.path.splitext(filename)[0]

    dashboard = json.load(dashboard_data)

    # Some dashboards are not top-level entities in the JSON file
    if not is_dashboard(dashboard):
        [(basename, dashboard)] = dashboard.items()

    assert is_dashboard(dashboard)

    source = dashboard.get('__inputs', [{}])[0].get('name') or DEFAULT_SOURCE

    # Remove the 'id' field
    dashboard.pop('id', None)

    # Set dashboard title, if desired
    if title:
        dashboard['title'] = title

    # Unify time-range
    dashboard['time'] = {
        'from': 'now-6h',
        'to': 'now',
    }

    document = {
        'apiVersion': 'v1',
        'kind': 'ConfigMap',
        'metadata': {
            'name': name,
            'labels': {
                'release': 'kube-prometheus',
                'kind': 'dashboard',
                'heritage': 'MetalK8s',
            },
        },
        'data': {
            '{}.json'.format(name): json.dumps(
                {
                    'inputs': [{
                        'name': source,
                        'type': 'datasource',
                        'pluginId': 'prometheus',
                        'value': 'prometheus',
                    }],
                    'overwrite': True,
                    'dashboard': dashboard,
                },
                sort_keys=True,
                indent=2,
                separators=(',', ': '),
            )
        },
    }

    return yaml.dump(
        document,
        stream=output,
        default_style='|',
        default_flow_style=False,
        indent=4
    )

if __name__ == '__main__':
    main(
        sys.stdin,
        sys.stdout,
        filename=os.environ['FILENAME'],
        title=os.environ.get('TITLE', None),
    )
