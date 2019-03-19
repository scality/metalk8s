@ci @local @post
Feature: Coredns resolution
    Scenario: check dns
        Given Pods with app label 'kube-dns' are 'Running'
        Then The hostname 'kubernetes.default' should be resolved
