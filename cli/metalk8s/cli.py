import kubernetes.client
import kubernetes.config

def main():
    node_metadata = {
        'name': 'node1',
        'labels': {
            'metalk8s.scality.com/version': '2.0',
        },
        'annotations': {
            'metalk8s.scality.com/ssh-user': 'root',
        },
    }
    node_spec = kubernetes.client.V1NodeSpec(taints=[], unschedulable=True)
    node_body = kubernetes.client.V1Node(metadata=node_metadata, spec=node_spec)
    corev1.create_node(body=node_body)
