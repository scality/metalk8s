@ci @local @post
Feature: CoreDNS resolution
    Scenario: check DNS
        Given pods with label 'k8s-app=kube-dns' are 'Ready'
        Then the hostname 'kubernetes.default' should be resolved

    Scenario: check DNS host forward
        Given the Kubernetes API is available
        And coreDNS host forward is enabled
        Then pods with label 'k8s-app=kube-dns' are 'Ready'
        And the hostname 'google.com' should be resolved

    Scenario: check DNS host forward disabled
        Given the Kubernetes API is available
        And coreDNS host forward is disabled
        Then pods with label 'k8s-app=kube-dns' are 'Ready'
        And the hostname 'google.com' should not be resolved

    Scenario: DNS pods spreading
        Given the Kubernetes API is available
        And we are on a multi node cluster
        Then pods with label 'k8s-app=kube-dns' are 'Ready'
        And each pods with label 'k8s-app=kube-dns' are on a different node
