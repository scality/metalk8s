@post @ui
Feature: The UI should be reachable
    Scenario: Reach the UI
        Given the Kubernetes API is available
        Then we try to reach the UI