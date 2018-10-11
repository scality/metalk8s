Feature: MetalK8s preflight checks
    Check that the preflight checks catch errors in inventory

Scenario: Run preflight checks with invalid FQDN
    Given A list of kube masters:
        kube1
        -kube2
        kube3-
        kube4.
        kube5.com
        kube6@com
        7kube
    And A list of kube nodes:
        kube1
        -kube2
        kube3-
        kube4.
        kube5.com
        kube6@com
        7kube
    And A list of etcd nodes:
        kube1
        -kube2
        kube3-
    Then I generate an inventory with these lists
    When I run the preflight checks
    Then The preflight checks should fail with invalid FQDN:
        -kube2
        kube3-
        kube4.
        kube6@com

Scenario: Run preflight checks with capital letter
    Given A list of kube masters:
        Kube8
    And A list of kube nodes:
        Kube8
    And A list of etcd nodes:
        Kube8
    Then I generate an inventory with these lists
    When I run the preflight checks
    Then The preflight checks should fail with capital letter:
        Kube8
