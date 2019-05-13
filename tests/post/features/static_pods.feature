@ci @local @post
Feature: Static Pods management
    Scenario: Static Pods restart on configuration change
        Given the Kubernetes API is available
        And I have set up a static pod
        When I edit the configuration of the static pod
        And I use Salt to manage the static pod
        Then the static pod was changed
