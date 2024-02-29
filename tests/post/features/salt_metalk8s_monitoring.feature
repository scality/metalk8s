@post @ci @local @salt @alertmonitoring

Feature: SaltMetalK8sMonitoring
    Scenario: List all alerts
        Given the Kubernetes API is available
        And the Prometheus API is available
        And the Salt Master is available
        When we list all the alerts
        Then the Watchdog alert should be present

    Scenario: Silence Watchdog alert
        Given the Watchdog alert is present
        When we silence the Watchdog alert
        And we list all the silences
        And we list all the alerts
        Then the silence for the Watchdog alert should be present
        And the Watchdog alert should not be present

    Scenario: Unsilence Watchdog alert
        Given the silence for the Watchdog alert is present
        When we delete the silence for the Watchdog alert
        And we list all the silences
        And we list all the alerts
        Then the silence for the Watchdog alert should not be present
        And the Watchdog alert should be present
