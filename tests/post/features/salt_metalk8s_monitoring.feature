@post @ci @local @salt @alertmonitoring
Feature: SaltMetalK8sMonitoring
    Background:
        Given the Kubernetes API is available
        And the Prometheus API is available
        And the Salt Master is available

    Scenario: There are no silences active
        When we list the 'active' silences
        Then there should not be silences 'active'

    Scenario: Watchdog is one of active alerts
        When we list the 'active' alerts
        Then the 'Watchdog' alert should be in the list of 'active' alerts

    Scenario: Silence and Unsilence the Watchdog alert
        When we create a silence for the 'Watchdog' alert
        And we list the 'active' silences
        Then we should find the silence for the 'Watchdog' alert in the 'active' silences list
        And we poll the 'suppressed' alerts until find the 'Watchdog' alert or fail after 300 seconds
        When we delete the silence for the 'Watchdog' alert
        And we list the 'active' silences
        Then we should not find the silence for the 'Watchdog' alert in the 'active' silences list
        And we poll the 'active' alerts until find the 'Watchdog' alert or fail after 300 seconds