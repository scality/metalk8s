@post @ci @local @backup
Feature: Backup
    Scenario: Backup multiple times
        When we run the backup script 6 times
        And we wait 60 seconds for the backup-replication job to complete
        Then we have 5 backups on each node
