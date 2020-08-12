@local @solution
Feature: Solutions
    Scenario: Deploy Solution
        Given the Kubernetes API is available
        And no Solution 'example-solution' is imported
        And no Solution environment 'example-environment' is available
        And the Solution Configuration file is absent
        When we import a Solution archive '/var/tmp/example-solution.iso'
        Then Solution archive 'example-solution' is imported correctly
        And Solution 'example-solution' version '0.1.0-dev' is available
        When we activate Solution 'example-solution' version '0.1.0-dev'
        Then Solution 'example-solution' version '0.1.0-dev' is activated
        And CRD 'versionservers.example-solution.metalk8s.scality.com' exists in Kubernetes API
        And CRD 'clockservers.example-solution.metalk8s.scality.com' exists in Kubernetes API
        When we create a solution environment 'example-environment'
        Then solution environment 'example-environment' is available
        When we remove Taints on node 'bootstrap' before deployment
        And we deploy Solution 'example-solution' in environment 'example-environment' with version '0.1.0-dev'
        Then we have 1 running pod labeled 'app=example-solution-operator' in namespace 'example-environment'
        When we deactivate Solution 'example-solution'
        And we delete Solution 'example-solution' in environment 'example-environment'
        And we delete Solution environment 'example-environment'
        And we unimport Solution archive '/var/tmp/example-solution.iso'
        And we delete the Solution Configuration file
        Then we have no Solution 'example-solution' archive mounted
        And we have no Solution Configuration file present
