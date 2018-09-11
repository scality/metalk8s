Feature: External value API
    Check we can configure service parameters

Scenario: Change parameters of Nginx-ingress
    Given an installed platform
    When I add 'nginx_ingress_test_label.yml' to 'kube-master' group_vars
    And I redeploy 'ingress'
    And I look at daemonset 'nginx-ingress-controller' in 'kube-ingress' namespace
    Then I can see the test label
    When I remove 'nginx_ingress_test_label.yml' to 'kube-master' group_vars
    And I redeploy 'ingress'
    And I look at daemonset 'nginx-ingress-controller' in 'kube-ingress' namespace
    Then I can't see the test label

Scenario: Change parameters of Elasticsearch
    Given an installed platform
    When I add 'elasticsearch_test_label.yml' to 'kube-master' group_vars
    And I redeploy 'elasticsearch'
    And I look at deployment 'elasticsearch-client' in 'kube-ops' namespace
    Then I can see the test label
    When I look at cronjob 'elasticsearch-curator' in 'kube-ops' namespace
    Then I can see the test label
    When I look at deployment 'es-exporter-elasticsearch-exporter' in 'kube-ops' namespace
    Then I can see the number of replicas '2'
    When I remove 'elasticsearch_test_label.yml' to 'kube-master' group_vars
    And I redeploy 'elasticsearch'
    And I look at deployment 'elasticsearch-client' in 'kube-ops' namespace
    Then I can't see the test label
    When I look at cronjob 'elasticsearch-curator' in 'kube-ops' namespace
    Then I can't see the test label
    When I look at deployment 'es-exporter-elasticsearch-exporter' in 'kube-ops' namespace
    Then I can see the number of replicas '1'
