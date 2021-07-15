@post @ci @local @monitoring
Feature: Monitoring is up and running
    Scenario: List Pods
        Given the Kubernetes API is available
        Then the 'pods' list should not be empty in the 'metalk8s-monitoring' namespace

    Scenario: Expected Pods
        Given the Kubernetes API is available
        Then we have 1 running pod labeled 'app=prometheus-operator-operator' in namespace 'metalk8s-monitoring'
        And we have 1 running pod labeled 'prometheus=prometheus-operator-prometheus' in namespace 'metalk8s-monitoring'
        And we have 1 running pod labeled 'alertmanager=prometheus-operator-alertmanager' in namespace 'metalk8s-monitoring'
        And we have 1 running pod labeled 'app.kubernetes.io/name=grafana' in namespace 'metalk8s-monitoring'
        And we have 1 running pod labeled 'app.kubernetes.io/name=kube-state-metrics' in namespace 'metalk8s-monitoring'
        And we have 1 running pod labeled 'app.kubernetes.io/name=prometheus-adapter' in namespace 'metalk8s-monitoring'
        And we have 1 running pod labeled 'app=prometheus-node-exporter' in namespace 'metalk8s-monitoring' on node 'bootstrap'

    Scenario: Monitored components statuses
        Given the Kubernetes API is available
        And the Prometheus API is available
        Then job 'prometheus-operator-alertmanager' in namespace 'metalk8s-monitoring' is 'up'
        And job 'apiserver' in namespace 'default' is 'up'
        And job 'kube-controller-manager' in namespace 'kube-system' is 'up'
        And job 'kube-scheduler' in namespace 'kube-system' is 'up'
        And job 'node-exporter' in namespace 'metalk8s-monitoring' is 'up'
        And job 'prometheus-operator-operator' in namespace 'metalk8s-monitoring' is 'up'
        And job 'prometheus-operator-prometheus' in namespace 'metalk8s-monitoring' is 'up'
        And job 'kube-state-metrics' in namespace 'metalk8s-monitoring' is 'up'

    Scenario: The metrics.k8s.io/v1beta1 API is available
        Given the Kubernetes API is available
        And pods with label 'app.kubernetes.io/name=prometheus-adapter' are 'Ready'
        And the 'v1beta1.metrics.k8s.io' APIService exists
        Then the 'v1beta1.metrics.k8s.io' APIService is Available

    Scenario: Pod metrics can be retrieved using metrics.k8s.io/v1beta1
        Given the Kubernetes API is available
        And pods with label 'app.kubernetes.io/name=prometheus-adapter' are 'Ready'
        Then a pod with label 'component=kube-apiserver' in namespace 'kube-system' has metrics

    Scenario: Node metrics can be retrieved using metrics.k8s.io/v1beta1
        Given the Kubernetes API is available
        And pods with label 'app.kubernetes.io/name=prometheus-adapter' are 'Ready'
        Then a node with label 'node-role.kubernetes.io/bootstrap=' has metrics

    Scenario: Ensure deployed Prometheus rules match the default
        Given the Kubernetes API is available
        And we have 1 running pod labeled 'prometheus=prometheus-operator-prometheus' in namespace 'metalk8s-monitoring'
        Then the deployed Prometheus alert rules are the same as the default alert rules

    Scenario: Volume metrics can be found based on device name
        Given the Kubernetes API is available
        And the Prometheus API is available
        And a test Volume 'test-monitoring1' exists
        Then I can get I/O stats for this test Volume's device
