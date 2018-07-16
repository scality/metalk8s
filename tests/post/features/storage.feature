Feature: Check that storage works correctly

   Scenario: Storage access and reclaim script
   Given A complete installation
   Given Some PersistentVolume should be in 'Available' state
   When I launch test storage pod
   Then The result of test storage pod should be 'success'
   When I clean the pvc
   Then Some PersistentVolume should be in 'Released' state
   When I launch ansible with the 'reclaim-storage.yml' playbook
   Then Playbook should complete without error
   And No PersistentVolume should be in 'Released' state
