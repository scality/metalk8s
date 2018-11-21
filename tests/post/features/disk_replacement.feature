Feature: We can change a drive from a node of metalk8s

  Scenario: Remove first drive of first node of metalk8s
  Given an installed platform
  Given I work on first server
  Given the first drive has to be changed
  When I drain first server
  When I launch the playbook 'unmount-drive.yml'
  Then Playbook should complete without error
  When I virtually change the disk of the server
  And I redeploy 'storage'
  Then I uncordon first server
