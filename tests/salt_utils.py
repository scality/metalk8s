import json


def get_json(host, args):
    with host.sudo():
        args = ['salt-call', '--local', '--out', 'json'] + args
        result = host.check_output(args)

    return json.loads(result)['local']

def get_pillar(host, key):
    return get_json(host, ['pillar.get', key])
