Feature: CreateVolume
 Scenario: CreateVolume with SparseLoopDevice
     Given I log in
     When I go to the volume page by click the volume icon in the sidebar
     And I go to create volume page by click on Create a New Volume button
     Then I fill out the create volume form with SparseLoopDevice volume type and check if the status is Ready
