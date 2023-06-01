{%- set ingress_controller_defaults = salt.slsutil.renderer(
        'salt://metalk8s/addons/nginx-ingress/config/ingress-controller.yaml.j2', saltenv=saltenv
    )
%}

{%- set ingress_controller = salt.metalk8s_service_configuration.get_service_conf(
        'metalk8s-ingress', 'metalk8s-ingress-controller-config', ingress_controller_defaults
    )
%}

Create Ingress Controller configuration Config Map:
  metalk8s_kubernetes.object_present:
    - manifest:
        apiVersion: v1
        kind: ConfigMap
        metadata:
          name: ingress-nginx-controller
          namespace: metalk8s-ingress
          labels:
            app.kubernetes.io/component: controller
            app.kubernetes.io/instance: ingress-nginx
            app.kubernetes.io/managed-by: salt
            app.kubernetes.io/name: ingress-nginx
            app.kubernetes.io/part-of: metalk8s
            heritage: metalk8s
        data:
          {{ ingress_controller.spec.config | yaml(False) | indent(10) }}

