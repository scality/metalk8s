Feature: prometheus configured correctly

   Scenario: Check node_exporter prometheus endpoints
   Given an installed platform
   When I run 'kubectl proxy' in a supported shell
   And I list the prometheus 'node-exporter' job endpoints
   Then I should count as many endpoints as kube-master:kube-node:etcd hosts
