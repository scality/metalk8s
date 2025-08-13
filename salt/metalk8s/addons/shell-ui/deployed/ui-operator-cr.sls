{%- from "metalk8s/repo/macro.sls" import build_image_name with context %}

{%- set shell_ui_image = build_image_name('shell-ui') %}

Create ScalityUI for control plane:
  metalk8s_kubernetes.object_present:
    - manifest:
        apiVersion: ui.scality.com/v1alpha1
        kind: ScalityUI
        metadata:
          name: shell-ui-cp
          namespace: metalk8s-ui
          labels:
            app.kubernetes.io/name: shell-ui-cp
            app.kubernetes.io/managed-by: salt
            app.kubernetes.io/part-of: metalk8s
            heritage: metalk8s
        spec:
          networks:
            ingressClassName: nginx-control-plane
          productName: MetalK8s
          image: {{ shell_ui_image }}
          auth:
            clientId: control-plane-ui
            kind: OIDC
            providerLogout: true
            providerUrl: "/oidc"
            redirectUrl: "{{ salt.metalk8s_network.get_control_plane_ingress_endpoint() }}/"
            responseType: code
            scopes: openid email profile
          navbar:
            main:
              - internal:
                  kind: metalk8s-ui
                  view: platform
                  groups: [metalk8s:admin]
              - internal:
                kind: metalk8s-ui
                view: alerts
                groups: [metalk8s:admin]

Create ScalityUI for workload plane:
  metalk8s_kubernetes.object_present:
    - manifest:
        apiVersion: ui.scality.com/v1alpha1
        kind: ScalityUI
        metadata:
          name: shell-ui-wp
          namespace: metalk8s-ui
          labels:
            app.kubernetes.io/name: shell-ui-wp
            app.kubernetes.io/managed-by: salt
            app.kubernetes.io/part-of: metalk8s
            heritage: metalk8s
        spec:
          networks:
            ingressClassName: nginx
          productName: MetalK8s
          image: {{ shell_ui_image }}
          auth:
            clientId: control-plane-ui
            kind: OIDC
            providerLogout: true
            providerUrl: "/oidc"
            redirectUrl: "{{ salt.metalk8s_network.get_control_plane_ingress_endpoint() }}/"
            responseType: code
            scopes: openid profile email groups offline_access audience:server:client_id:oidc-auth-client
          navbar:
            main:
              - internal:
                  kind: metalk8s-ui
                  view: platform
                  groups: [metalk8s:admin]
              - internal:
                kind: metalk8s-ui
                view: alerts
                groups: [metalk8s:admin]