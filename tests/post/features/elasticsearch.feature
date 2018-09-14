Feature: Elasticsearch configured correctly

	Scenario: Check Elasticsearch service status
	Given an installed platform
	When I run 'kubectl proxy' in a supported shell
	And I request the elasticsearch cluster health status
	Then I should find the cluster with a green status
