@post @ci @local @network
Feature: Network
    Scenario: All expected listening processes
        Given the Kubernetes API is available
        And we run on an untainted single node
        Then ports check succeed
        And we have only expected processes listening
