@ci @local @post
Feature: CoreDNS resolution
    Scenario: check DNS
        Given pods with label 'k8s-app=kube-dns' are 'Running'
        Then the hostname 'kubernetes.default' should be resolved
