import kubernetes.client
import kubernetes.config

import pepper

import logging
logging.basicConfig(level=logging.DEBUG)

def main():
    client = kubernetes.config.new_client_from_config()
    corev1 = kubernetes.client.CoreV1Api(api_client=client)

    if True:
        corev1.create_node(
            body=kubernetes.client.V1Node(
                metadata={
                    'name': 'node1',
                    'labels': {
                        'metalk8s.scality.com/version': '2.1',
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
                    taints=[
                        kubernetes.client.V1Taint(
                            key='metalk8s.scality.com/deployed',
                            value='false',
                            effect='NoExecute',
                        ),
                    ],
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
            saltenv='metalk8s-2.1',
            pillar=pillar,
        )
        print(result)
