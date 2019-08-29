Feature: CreateVolume
   Scenario: CreateVolume with RawBlockDevice
     Given I log in
     When I go to the nodes list by click the node icon in the sidebar
     And I go to the bootstrap node by click on the bootstrap row in the list
     And I choose the Volumes tag
     And I go to create volume page by click on Create a New Volume button
     Then I fill out the create volume form with RawBlockDevice volume type and ckeck if the the volume I created is displayed on the volume list
   