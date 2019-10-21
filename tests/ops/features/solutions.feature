@ops @ci @local
Feature: Solutions management
    Scenario: Add a Solution to the cluster
        Given the Kubernetes API is available
        And the Solution archive exists at "/root/iso/example-solution-0.1.0-dev.iso"
        When we add the Solution archive "/root/iso/example-solution-0.1.0-dev.iso"
        Then the Solution "example-solution-0.1.0-dev" is mounted at "/srv/scality/example-0.1.0-dev"
        And we can retrieve the image "base-server:0.1.0-dev" from Solution "example-solution-0.1.0-dev" repository

    Scenario: Remove a Solution from the cluster
        Given the Solution archive "/root/iso/example-solution-0.1.0-dev.iso" is available
        When we remove the Solution archive "/root/iso/example-solution-0.1.0-dev.iso"
        Then the mountpoint "/srv/scality/example-0.1.0-dev" is absent
        And the image "example-solution-0.1.0-dev/base-server:0.1.0-dev" is not available from the registry

    Scenario: Deploy a Solution components in a specific version
        Given the Solution archive "/root/iso/example-solution-0.1.0-dev.iso" is available
        When we deploy the Solution "example-solution" with version "0.1.0-dev"
        Then the Admin UI for Solution "example-solution" is exposed in version "0.1.0-dev"
        And the Solution "example-solution", with version "0.1.0-dev", is marked as active in the Pillar

    Scenario: Deploy a Solution components in the latest version
        Given the Solution archive "/root/iso/example-solution-0.1.0-dev.iso" is available
        When we deploy the Solution "example-solution" with version "latest"
        Then the Admin UI for Solution "example-solution" is exposed in version "0.1.0-dev"
        And the Solution "example-solution", with version "0.1.0-dev", is marked as active in the Pillar

    Scenario: Undeploy a Solution components
        Given the Solution archive "/root/iso/example-solution-0.1.0-dev.iso" is available
        And the Solution archive "/root/iso/example-solution-0.1.0-dev.iso" is deployed
        When we undeploy the Solution "example-solution"
        Then no Admin UI for Solution "example-solution" is exposed
        And the Solution "example-solution", with version "0.1.0-dev", is marked as inactive in the Pillar
