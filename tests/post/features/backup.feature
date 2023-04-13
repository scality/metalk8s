@post @ci @local @backup
Feature: Backup
    Scenario: Backup multiple times
        When we run the backup script 6 times
        Then we have 5 backups on each node
