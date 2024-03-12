@post @ci @local @salt @cronjob
Feature: SaltMetalK8sKubernetesCronJob
    Background:
        Given the Kubernetes API is available
        And the Salt Master is available

    Scenario: Ensure the test CronJob is present
        Given the 'test-cronjob' CronJob is created
        When we list the 'active' CronJobs
        Then the 'test-cronjob' CronJob should be in the list of 'active' CronJobs

    Scenario: Suspend and activate a CronJob
        Given the 'test-cronjob' CronJob is created
        When we suspend the 'test-cronjob' CronJob marking it with 'test-suspend-mark'
        And we list the 'suspended' CronJobs
        Then the 'test-cronjob' CronJob should be in the list of 'suspended' CronJobs
        And the 'test-cronjob' CronJob should be marked with 'test-suspend-mark'
        When we activate the 'test-cronjob' CronJob
        And we list the 'active' CronJobs
        Then the 'test-cronjob' CronJob should be in the list of 'active' CronJobs
        And the 'test-cronjob' CronJob should not be marked

    Scenario: Stop the Cronjob and delete all its Jobs
        Given the 'test-cronjob' CronJob is created
        And we poll the 'test-cronjob' CronJob until it has jobs or fail after 120 seconds
        When we stop the 'test-cronjob' CronJob marked with 'test-suspend-mark' and delete all its Jobs
        And we list the 'suspended' CronJobs
        And we look for the 'test-cronjob' CronJobs Jobs
        Then the 'test-cronjob' CronJob should be in the list of 'suspended' CronJobs
        And the 'test-cronjob' CronJob should be marked with 'test-suspend-mark'
        And the 'test-cronjob' jobs should be empty
