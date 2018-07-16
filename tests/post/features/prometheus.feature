Feature: prometheus configured correctly

   Scenario: Check node_exporter prometheus endpoints
   Given A complete installation
   When I run 'kubectl proxy' in a supported shell
   And I list the prometheus 'node-exporter' job endpoints
   Then I should count as many endpoints as all hosts
