@post @ci @local @monitoring
Feature: Monitoring is up and running
    Scenario: List Pods
        Given the Kubernetes API is available
        Then the 'pods' list should not be empty in the 'metalk8s-monitoring' namespace

    Scenario: Expected Pods
        Given the Kubernetes API is available
        Then we have 1 running pod labeled 'k8s-app=prometheus-operator' in namespace 'metalk8s-monitoring'
        And we have 2 running pod labeled 'prometheus=k8s' in namespace 'metalk8s-monitoring'
        And we have 3 running pod labeled 'alertmanager=main' in namespace 'metalk8s-monitoring'
        And we have 1 running pod labeled 'app=grafana' in namespace 'metalk8s-monitoring'
        And we have 1 running pod labeled 'app=kube-state-metrics' in namespace 'metalk8s-monitoring'
        And we have 1 running pod labeled 'app=node-exporter' in namespace 'metalk8s-monitoring' on node 'bootstrap'

    Scenario: Monitored components statuses
        Given the Kubernetes API is available
        And the Prometheus API is available
        Then job 'alertmanager-main' in namespace 'metalk8s-monitoring' is 'up'
        And job 'apiserver' in namespace 'default' is 'up'
        And job 'kube-controller-manager' in namespace 'kube-system' is 'up'
        And job 'kube-scheduler' in namespace 'kube-system' is 'up'
        And job 'node-exporter' in namespace 'metalk8s-monitoring' is 'up'
        And job 'prometheus-operator' in namespace 'metalk8s-monitoring' is 'up'
        And job 'prometheus-k8s' in namespace 'metalk8s-monitoring' is 'up'
        And job 'kube-state-metrics' in namespace 'metalk8s-monitoring' is 'up'

    Scenario: The metrics.k8s.io/v1beta1 API is available
        Given the Kubernetes API is available
        And we have 1 running pod labeled 'name=prometheus-adapter' in namespace 'metalk8s-monitoring'
        And the 'v1beta1.metrics.k8s.io' APIService exists
        Then the 'v1beta1.metrics.k8s.io' APIService is Available
