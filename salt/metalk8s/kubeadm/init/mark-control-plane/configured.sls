{% set hostname = salt['network.get_hostname']() %}

{% set kubeconfig = "/etc/kubernetes/admin.conf" %}
{% set context = "kubernetes-admin@kubernetes" %}

Apply control-plane role label:
  kubernetes.node_label_present:
    - name: "node-role.kubernetes.io/master"
    - kubeconfig: {{ kubeconfig }}
    - context: {{ context }}
    - node: {{ hostname }}
    - value: ""

Apply control-plane taints:
  kubernetes.node_taints_present:
    - name: {{ hostname }}
    - kubeconfig: {{ kubeconfig }}
    - context: {{ context }}
    - taints:
        - key: "node-role.kubernetes.io/master"
          effect: "NoSchedule"

Annotate with CRI socket information:
  kubernetes.node_annotation_present:
    - name: "kubeadm.alpha.kubernetes.io/cri-socket"
    - kubeconfig: {{ kubeconfig }}
    - context: {{ context }}
    - node: {{ hostname }}
    # TODO: the socket location may become configurable, we should make sure
    #       this value is accurate (hardcoded to the default value for now)
    - value: "/run/containerd/containerd.sock"
