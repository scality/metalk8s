Feature: metrics-server deployed in the cluster

    Scenario: Check node statistics can be retrieved
    Given an installed platform
    When I wait for metrics-server to be initialized
    And I GET a NodeMetricsList from /apis/metrics.k8s.io/v1beta1/nodes
    Then I should count as many nodes as k8s-cluster hosts
