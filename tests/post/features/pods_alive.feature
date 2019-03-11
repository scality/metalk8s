@liveness @post @ci @local
Feature: Pods should be alive
    Scenario: get pods
        Given The bootstrap phase is executed
        When I run 'sudo crictl ps -q'
        Then Pods list should not be empty
