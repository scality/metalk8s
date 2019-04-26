import sys
import os.path
import logging
import argparse

import kubernetes.client

import pepper

import metalk8s.kubernetes

def _main():
    import kubernetes.config
    import pepper

    client = kubernetes.config.new_client_from_config()
    corev1 = kubernetes.client.CoreV1Api(api_client=client)

    if True:
        corev1.create_node(
            body=kubernetes.client.V1Node(
                metadata={
                    'name': 'node1',
                    'labels': {
                        'metalk8s.scality.com/version': '2.0',
                        'node-role.kubernetes.io/node': '',
                        'node-role.kubernetes.io/infra': '',
                    },
                    'annotations': {
                        'metalk8s.scality.com/ssh-user': 'vagrant',
                        'metalk8s.scality.com/ssh-host': '172.21.254.13',
                        'metalk8s.scality.com/ssh-key-path':
                            '/etc/metalk8s/pki/preshared_key_for_k8s_nodes',
                        'metalk8s.scality.com/ssh-sudo': 'true',
                    },
                },
                spec=kubernetes.client.V1NodeSpec(
                    taints=[],
                    unschedulable=True,
                ),
            ),
        )

    if True:
        salt = pepper.Pepper('http://172.21.254.9:4507', debug_http=True)
        result = salt.login(
            username='admin',
            token='YWRtaW46YWRtaW4=',
            token_type='Basic',
            eauth='kubernetes_rbac',
        )
        print(result)

        pillar = {
            'bootstrap_id': 'bootstrap',
            'node_name': 'node1',
        }

        result = salt.runner(
            fun='state.orchestrate',
            arg=('metalk8s.orchestrate.deploy_new_node',),
            saltenv='metalk8s-2.0',
            pillar=pillar,
        )
        print(result)


def _create_node(args):
    roles = set(args.roles)
    role_labels = metalk8s.kubernetes.calculate_labels(roles)

    labels = {}
    labels.update(metalk8s.kubernetes.calculate_labels(roles))
    labels.update({
        'metalk8s.scality.com/version': args.version,
    })

    annotations = {}
    bool_ = lambda b: 'true' if b else 'false'
    for (attr, annotation, fn) in [
            ('ssh_host', 'ssh-host', str),
            ('ssh_port', 'ssh-port', str),
            ('ssh_user', 'ssh-user', str),
            ('ssh_key_path', 'ssh-key-path', str),
            ('ssh_sudo', 'ssh-sudo', bool_),
            ]:
        value = getattr(args, attr)
        if value is not None:
            annotations['metalk8s.scality.com/{}'.format(annotation)] = \
                fn(value)

    node = kubernetes.client.V1Node(
        metadata={
            'name': args.name,
            'labels': labels,
            'annotations': annotations,
        },
        spec=kubernetes.client.V1NodeSpec(
            taints=metalk8s.kubernetes.calculate_taints(roles),
            unschedulable=True,
        ),
    )

    client = kubernetes.config.new_client_from_config()
    corev1 = kubernetes.client.CoreV1Api(api_client=client)

    corev1.create_node(node)


def _deploy_node(args):
    salt = pepper.Pepper('http://172.21.254.13:4507')
    salt.login(
        username='admin',
        token='YWRtaW46YWRtaW4=',
        token_type='Basic',
        eauth='kubernetes_rbac',
    )

    pillar = {
        'bootstrap_id': 'bootstrap',
        'node_name': args.name,
    }

    sys.stderr.write('Deploying node, this can take a while\n')
    sys.stderr.flush()

    result = salt.runner(
        fun='state.orchestrate',
        arg=('metalk8s.orchestrate.deploy_new_node',),
        saltenv='metalk8s-2.0',
        pillar=pillar,
    )

    if result['return'][0]['retcode'] != 0:
        raise Exception(repr(result))


def _build_parser():
    if os.path.split(sys.argv[0])[1] == '__main__.py':
        prog = __name__.split('.', 1)[0]
    else:
        prog = sys.argv[0]

    epilog = '''
When no options are provided, the default kubeconfig is used to connect to the
Kubernetes API.

Use "%(prog)s <command> --help" for more information about a given command.
    '''

    parser = argparse.ArgumentParser(
        prog=prog,
        description='%(prog)s controls a MetalK8s cluster',
        epilog=epilog,
    )

    subparsers = parser.add_subparsers(
        description='The following subcommands are available',
    )


    get = subparsers.add_parser(
        'get',
        help='display one of many resources',
    )

    create = subparsers.add_parser(
        'create',
        help='create a resource',
    )
    create_subparsers = create.add_subparsers(
        description='The following resources are available',
    )
    create_node = create_subparsers.add_parser(
        'node',
        help='create a node',
    )
    create_node.set_defaults(
        handler=_create_node,
    )
    create_node.add_argument(
        'name',
        metavar='NAME',
        help='name of the node, e.g. its hostname',
    )
    create_node.add_argument(
        '--version',
        metavar='VERSION',
        help='version of MetalK8s to deploy on the node',
        required=True,
    )
    create_node.add_argument(
        '--role',
        choices=[
            metalk8s.kubernetes.ROLE_MASTER,
            metalk8s.kubernetes.ROLE_NODE,
            metalk8s.kubernetes.ROLE_INFRA,
            metalk8s.kubernetes.ROLE_ETCD
        ],
        help=' '.join([
            'role of the node in the cluster',
            '(can be specified multiple times)',
        ]),
        action='append',
        default=[],
        dest='roles',
    )

    create_node_ssh = create_node.add_argument_group(
        'ssh',
        'SSH access configuration',
    )
    create_node_ssh.add_argument(
        '--ssh-user',
        help='username for SSH access',
        metavar='USER',
        default='root',
    )
    create_node_ssh.add_argument(
        '--ssh-host',
        metavar='ADDRESS',
        help='host or address for SSH access, default node name',
    )
    create_node_ssh.add_argument(
        '--ssh-port',
        help='port for SSH access, default 22',
        metavar='PORT',
        default=22,
        type=int,
    )
    create_node_ssh.add_argument(
        '--ssh-sudo',
        help='use sudo to gain root access',
        action='store_true',
    )
    create_node_ssh.add_argument(
        '--ssh-key-path',
        help=' '.join([
            'path to the SSH private key to access the server',
            '(on the Salt master)',
        ]),
        metavar='FILE',
        required=True,
    )

    deploy = subparsers.add_parser(
        'deploy',
        help='manage deployment of a resource',
    )

    deploy_subparsers = deploy.add_subparsers(
        description='The following resources are available',
    )
    deploy_node = deploy_subparsers.add_parser(
        'node',
        help='deploy a node',
    )
    deploy_node.set_defaults(
        handler=_deploy_node,
    )
    deploy_node.add_argument(
        'name',
        metavar='NAME',
        help='name of the node',
    )



    kubeconfig = parser.add_argument_group(
        'kubeconfig',
        'API access configuration through a kubeconfig file',
    )
    kubeconfig.add_argument(
        '--kubeconfig',
        help='path to the kubeconfig file to use for CLI requests',
        type=argparse.FileType('r'),
        metavar='FILE',
    )
    kubeconfig.add_argument(
        '--cluster',
        help='the name of the kubeconfig cluster to use',
    )
    kubeconfig.add_argument(
        '--context',
        help='the name of the kubeconfig context to use',
    )
    kubeconfig.add_argument(
        '--user',
        help='the name of the kubeconfig user to use',
    )


    authn = parser.add_argument_group(
        'authentication',
        'API authentication options',
    )
    authn.add_argument(
        '--client-certificate',
        help='path to a client certificate file for TLS',
        type=argparse.FileType('r'),
        metavar='FILE',
    )
    authn.add_argument(
        '--client-key',
        help='path to a client key file for TLS',
        type=argparse.FileType('r'),
        metavar='FILE',
    )
    authn.add_argument(
        '--token',
        help='bearer token for authentication to the API server',
    )
    authn.add_argument(
        '--username',
        help='username for basic authentication to the API server',
    )
    authn.add_argument(
        '--password',
        help='password for basic authentication to the API server',
    )


    endpoint = parser.add_argument_group(
        'endpoint',
        'API endpoint options',
    )
    endpoint.add_argument(
        '-s', '--server',
        help='the address and port of the Kubernetes API server',
        metavar='URL',
    )
    endpoint.add_argument(
        '--certificate-authority',
        help='path to a cert file for the certificate authority',
        type=argparse.FileType('r'),
        metavar='FILE',
    )
    endpoint.add_argument(
        '--insecure-skip-tls-verify',
        help=' '.join([
            "do not check the server's certificate for validity",
            "(this will make your HTTPS connections insecure)",
        ]),
        action='store_true',
    )


    parser.add_argument(
        '--loglevel',
        help='log level (0 = DEBUG, 5 = FATAL)',
        choices=range(0, 6),
        type=int,
        metavar='LEVEL',
    )
    #parser.add_argument(
    #    '--stderrthreshold',
    #    help='logs at or above this threshold go to stderr',
    #)
    #parser.add_argument(
    #    '-v', '--v',
    #    help='log level for V logs',
    #)
    parser.add_argument(
        '--version',
        help='print version information and quit',
        action='version',
        version='%(prog)s 0.0.0',
    )

    return parser


def main(args=None):
    parser = _build_parser()

    result = parser.parse_args(args)
    result.handler(result)
