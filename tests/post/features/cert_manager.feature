@post @local @ci @cert
Feature: CertManager
    Scenario: Create a self-signed ClusterIssuer
        Given the Kubernetes API is available
        When we create the following ClusterIssuer:
            apiVersion: cert-manager.io/v1
            kind: ClusterIssuer
            metadata:
              name: test-selfsigned-issuer
              labels:
                app.kubernetes.io/name: cert-manager
                app.kubernetes.io/managed-by: metalk8s
            spec:
              selfSigned: {}
        Then the 'test-selfsigned-issuer' ClusterIssuer is 'Available'

    Scenario: Create a Certificate Authority
        Given the Kubernetes API is available
        And a 'test-selfsigned-issuer' self-signed ClusterIssuer exists
        When we create the following Certificate:
            apiVersion: cert-manager.io/v1
            kind: Certificate
            metadata:
              name: test-root-ca
              labels:
                app.kubernetes.io/name: cert-manager
                app.kubernetes.io/managed-by: metalk8s
              namespace: metalk8s-certs
            spec:
              isCA: true
              commonName: Metalk8s-CA
              secretName: test-root-ca
              duration: 86400h
              renewBefore: 2160h
              issuerRef:
                name: test-selfsigned-issuer
                kind: ClusterIssuer
                group: cert-manager.io
        Then the 'test-root-ca' Certificate is 'Available'
        And the 'test-root-ca' Certificate Secret has the correct fields
