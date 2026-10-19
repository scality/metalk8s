@post @ci @local @upgrade
Feature: Upgrade
    # Every node already completed this version, so the upgrade skips them
    # all. This keeps the scenario cheap, and it covers the path where the
    # upgrade deploys nothing
    Scenario: Upgrade to the installed version
        Given the Kubernetes API is available
        And every node completed the installed version
        When we run the upgrade to the installed version
        Then the Kubernetes API is available
        And no node is unschedulable
