@post @ci @local @slow @backup
Feature Backup
    Scenario: Backup multiple times
        Given we run the backup script 6 times
        Then we have 5 backups
