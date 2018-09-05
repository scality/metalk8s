Feature: run kubectl command via 'make shell'

   Scenario: Get nodes
   Given A complete installation
   When I run 'kubectl get nodes' in a supported shell
   Then I should get a good list of nodes
