'''Grafana dashboard handling routines.'''

import json


__virtualname__ = 'metalk8s_grafana'


def __virtual__():
    return __virtualname__


def load_dashboard(
        path,
        saltenv='base',
        title=None,
        tags=None,
        datasource_variable=None,
        ):
    '''Load and fixup a Grafana dashboard.'''

    dashboard_data = __salt__['cp.get_file_str'](path=path, saltenv=saltenv)

    assert dashboard_data, 'Unable to load file contents'

    dashboard = json.loads(dashboard_data)

    # Any edits would be overwritten anyway, so disallow edits
    dashboard['editable'] = False

    if title is not None:
        dashboard['title'] = title

    if tags is not None:
        dashboard['tags'] = tags

    # This is some serious Grafana black magic
    # Some references:
    # - https://grafana.com/docs/reference/dashboard/
    # - https://grafana.com/docs/reference/templating/
    if datasource_variable is not None:
        templating = dashboard.setdefault('templating', {})
        templating_list = templating.setdefault('list', [])
        templating_list.insert(0, {
            'current': {
                'text': 'Prometheus',
                'value': 'Prometheus',
            },
            'hide': 2,
            'name': datasource_variable,
            'query': 'prometheus',
            'type': 'datasource',
        })

    return dashboard
