@post @ci @local
Feature: Pods should be alive
    Scenario: List Pods
        Given the Kubernetes API is available
        Then the 'pods' list should not be empty in the 'kube-system' namespace

    Scenario: Expected Pods
        Given the Kubernetes API is available
        Then we have at least 1 running pod labeled 'component=kube-controller-manager'
        And we have at least 1 running pod labeled 'component=kube-scheduler'
        And we have at least 1 running pod labeled 'component=kube-apiserver'
        And we have at least 1 running pod labeled 'component=etcd'
        And we have at least 1 running pod labeled 'k8s-app=kube-proxy'
        And we have at least 1 running pod labeled 'k8s-app=calico-node'
        And we have at least 2 running pod labeled 'k8s-app=kube-dns'
        And we have at least 1 running pod labeled 'app=salt-master'
        And we have at least 1 running pod labeled 'app=repositories'

    Scenario: Exec in Pods
        Given the Kubernetes API is available
        Then we can exec 'true' in the pod labeled 'app=salt-master' in the 'kube-system' namespace
