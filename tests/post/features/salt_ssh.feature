@post @ci @local @saltssh
Feature: saltssh
    Scenario: salt-ssh state work on every non-bootstrap nodes
        Given the Kubernetes API is available
        And we are on a multi node cluster
        Then we are able to run 'metalk8s.node.grains' using salt-ssh on non-bootstrap nodes
