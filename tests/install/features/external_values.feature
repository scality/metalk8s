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
