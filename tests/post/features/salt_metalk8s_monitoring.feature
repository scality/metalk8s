@post @ci @local @salt @alertmonitoring

Feature: SaltMetalK8sMonitoring
    Scenario: List all alerts
        Given the Kubernetes API is available
        And the Prometheus API is available
        And the Salt Master is available
        When we list all the alerts
        Then the Watchdog alert should be present
