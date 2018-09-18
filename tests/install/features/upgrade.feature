Feature: MetalK8s upgrade

Scenario: Upgrade from 1.0.0
    Given A complete inventory
    When I launch ansible playbook 'deploy.yml' from version 1.0.0
    Then Playbook should complete without error
    When I launch ansible playbook 'deploy.yml' from version HEAD
    Then Playbook should complete without error
