Glossary
========

.. _kubectl: https://kubernetes.io/docs/reference/kubectl/kubectl/
.. |kubectl| replace:: ``kubectl``

.. |see K8s docs| replace:: See also the official Kubernetes documentation for
.. |see salt docs| replace:: See also the official SaltStack documentation for

.. glossary::

   Alertmanager
     The Alertmanager is a service for handling alerts sent by client
     applications, such as :term:`Prometheus`.

     See also the official Prometheus documentation for
     `Alertmanager <https://prometheus.io/docs/alerting/alertmanager/>`_.

   API Server
   ``kube-apiserver``
     The Kubernetes API Server validates and configures data for the Kubernetes
     objects that make up a cluster, such as :term:`Nodes <Node>` or
     :term:`Pods <Pod>`.

     |see K8s docs|
     `kube-apiserver <https://kubernetes.io/docs/reference/command-line-tools-reference/kube-apiserver/>`_.

   Bootstrap
   Bootstrap node
     The Bootstrap node is the first machine on which MetalK8s is installed,
     and from where the cluster will be deployed to other machines. It also
     serves as the entrypoint for upgrades of the cluster.

   ConfigMap
     A ConfigMap is a Kubernetes object that allows one to store general
     configuration information such as environment variables in a key-value
     pair format.
     ConfigMaps can only be applied to namespaces and once created, they can
     be updated automatically without the need of restarting containers that
     depend on it.

     |see K8s docs|
     `ConfigMap <https://kubernetes.io/docs/tasks/configure-pod-container/configure-pod-configmap/#understanding-configmaps-and-pods/>`_.

   Controller Manager
   ``kube-controller-manager``
     The Kubernetes controller manager embeds the core control loops shipped
     with Kubernetes, which role is to watch the shared state from
     :term:`API Server` and make changes to move the current state towards
     the desired state.

     |see K8s docs|
     `kube-controller-manager <https://kubernetes.io/docs/reference/command-line-tools-reference/kube-controller-manager/>`_.

   ``etcd``
     ``etcd`` is a distributed data store, which is used in particular for the
     persistent storage of :term:`API Server`.

     For more information, see `etcd.io <https://etcd.io>`_.

   Environment
     An Environment is a namespace or group of namespaces with specific labels
     containing one or more Solutions.
     It allows to run multiple instances of a Solution on the same cluster,
     without collision between them.

   Grafana
     Grafana is a service for analysing and visualizing metrics scraped by
     Prometheus.

     For more information, see `Grafana <https://grafana.com/docs/grafana/latest/>`_.

   Kubeconfig
     A configuration file for :term:`kubectl`, which includes authentication
     through embedded certificates.

     |see K8s docs|
     `kubeconfig <https://kubernetes.io/docs/concepts/configuration/organize-cluster-access-kubeconfig/>`_.

   Kubelet
     The kubelet is the primary "node agent" that runs on each cluster node.

     |see K8s docs|
     `kubelet <https://kubernetes.io/docs/reference/command-line-tools-reference/kubelet/>`_.

   Kube-state-metrics
     The kube-state-metrics service listens to the Kubernetes API server and
     generates metrics about the state of the objects.

     |see K8s docs|
     `kube-state-metrics <https://github.com/kubernetes/kube-state-metrics/tree/master/docs/>`_.

   Loki
     Loki is a log aggregation system designed to be cost-effective, only
     indexing metadata (labels).

     For more details, see `Loki documentation <https://grafana.com/docs/loki/latest/>`_.

   memberlist
     memberlist is a Go library that manages cluster membership and member
     failure detection using a gossip based protocol.
     memberlist is eventually consistent but converges quickly on average.

   Namespace
     A Namespace is a Kubernetes abstraction to support multiple virtual
     clusters backed by the same physical cluster, providing a scope for
     resource names.

     |see K8s docs|
     `namespaces <https://kubernetes.io/docs/concepts/overview/working-with-objects/namespaces/>`_.

   Node
     A Node is a Kubernetes worker machine - either virtual or physical.
     A Node contains the services required to run :term:`Pods <Pod>`.

     |see K8s docs|
     `Nodes <https://kubernetes.io/docs/concepts/architecture/nodes/>`_.

   Node manifest
     The YAML file describing a :term:`Node`.

     |see K8s docs|
     `Nodes management <https://kubernetes.io/docs/concepts/architecture/nodes/#management>`_.

   Operator
     A Kubernetes operator is an application-specific controller that extends
     the functionality of the Kubernetes API to create, configure, and manage
     instances of complex applications.

     |see K8s docs|
     `Operator <https://kubernetes.io/docs/concepts/extend-kubernetes/operator/>`_.

   Pod
     A Pod is a group of one or more containers sharing storage and network
     resources, with a specification of how to run these containers.

     |see K8s docs|
     `Pods <https://kubernetes.io/docs/concepts/workloads/pods/pod/>`_.

   Prometheus
     Prometheus serves as a time-series database, and is used in MetalK8s as
     the storage for all metrics exported by applications, whether being
     provided by the cluster or installed afterwards.

     For more details, see `prometheus.io <https://prometheus.io>`_.

   Prometheus Node-exporter
     The Prometheus node-exporter is an exporter for exposing hardware and
     OS metrics read from the Linux Kernel. Users can typically obtain the
     following metrics; cpu, memory, filesystem for each Kubernetes node.

    For more details, see `prometheus node-exporter <https://prometheus.io/docs/guides/node-exporter>`_.

   SaltAPI
     SaltAPI is an HTTP service for exposing operations to perform with a
     :term:`Salt Master`. The version deployed by MetalK8s is configured to
     use the cluster authentication/authorization services.

     |see Salt docs|
     `SaltAPI <https://docs.saltstack.com/en/latest/ref/netapi/all/salt.netapi.rest_cherrypy.html#a-rest-api-for-salt>`_.

   Salt Master
     The Salt Master is a daemon responsible for orchestrating infrastructure
     changes by managing a set of :term:`Salt Minions <Salt Minion>`.

     |see Salt docs|
     `Salt Master <https://docs.saltstack.com/en/latest/topics/development/architecture.html#salt-master>`_.

   Salt Minion
     The Salt Minion is an agent responsible for operating changes on a system.
     It runs on all MetalK8s nodes.

     |see Salt docs|
     `Salt Minion <https://docs.saltstack.com/en/latest/topics/development/architecture.html#salt-minion>`_.

   Scheduler
   ``kube-scheduler``
     The Kubernetes scheduler is responsible for assigning :term:`Pods <Pod>`
     to specific :term:`Nodes <Node>` using a complex set of constraints and
     requirements.

     |see K8s docs|
     `kube-scheduler <https://kubernetes.io/docs/reference/command-line-tools-reference/kube-scheduler/>`_.

   Secret
     Kubernetes Secrets let you store and manage sensitive information,
     such as passwords, OAuth tokens, and SSH keys.

     |see K8s docs|
     `Secrets <https://kubernetes.io/docs/concepts/configuration/secret/>`_.

   Service
     A Kubernetes Service is an abstract way to expose an application running
     on a set of :term:`Pods <Pod>` as a network service.

     |see K8s docs|
     `Services <https://kubernetes.io/docs/concepts/services-networking/service/>`_.

   Taint
     Taints are a system for Kubernetes to mark :term:`Nodes <Node>` as
     reserved for a specific use-case. They are used in conjunction with
     :term:`tolerations <Toleration>`.

     |see K8s docs|
     `taints and tolerations <https://kubernetes.io/docs/concepts/configuration/taint-and-toleration/>`_.

   Toleration
     Tolerations allow to mark :term:`Pods <Pod>` as schedulable for all
     :term:`Nodes <Node>` matching some *filter*, described with
     :term:`taints <Taint>`.

     |see K8s docs|
     `taints and tolerations <https://kubernetes.io/docs/concepts/configuration/taint-and-toleration/>`_.

   ``kubectl``
     |kubectl| is a CLI interface for interacting with a Kubernetes cluster.

     |see K8s docs| |kubectl|_.


