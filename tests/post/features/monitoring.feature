@post @ci @local @monitoring
Feature: Monitoring is up and running
    Scenario: List Pods
        Given the Kubernetes API is available
        Then the 'pods' list should not be empty in the 'monitoring' namespace

    Scenario: Expected Pods
        Given the Kubernetes API is available
        Then we have 1 running pod labeled 'k8s-app=prometheus-operator' in namespace 'monitoring' on node 'bootstrap'
        And we have 2 running pod labeled 'prometheus=k8s' in namespace 'monitoring' on node 'bootstrap'
        And we have 3 running pod labeled 'alertmanager=main' in namespace 'monitoring' on node 'bootstrap'
        And we have 1 running pod labeled 'app=grafana' in namespace 'monitoring' on node 'bootstrap'
        And we have 1 running pod labeled 'app=kube-state-metrics' in namespace 'monitoring' on node 'bootstrap'
        And we have 1 running pod labeled 'app=node-exporter' in namespace 'monitoring' on node 'bootstrap'

    Scenario: Monitored components statuses
        Given the Kubernetes API is available
        And the Prometheus API is available
        Then job 'alertmanager-main' in namespace 'monitoring' is 'up'
        And job 'apiserver' in namespace 'default' is 'up'
        And job 'kube-controller-manager' in namespace 'kube-system' is 'up'
        And job 'kube-scheduler' in namespace 'kube-system' is 'up'
        And job 'node-exporter' in namespace 'monitoring' is 'up'
        And job 'prometheus-operator' in namespace 'monitoring' is 'up'
        And job 'prometheus-k8s' in namespace 'monitoring' is 'up'
        And job 'kube-state-metrics' in namespace 'monitoring' is 'up'
