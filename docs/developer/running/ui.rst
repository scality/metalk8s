Running the platform UI locally
===============================

Requirements
------------

- `Node.js <https://nodejs.org/en/>`_, 14.16

Prerequisites
-------------

- You should have a running Metalk8s cluster somewhere
- You should have installed the dependencies locally with
  ``cd ui; npm install``

Procedure
---------


#. Connect to the boostrap node of your cluster, and execute the following
   command as root:


.. code-block:: console

    kubectl --kubeconfig /etc/kubernetes/admin.conf \
        edit cm -n metalk8s-auth metalk8s-dex-config

This will allow you to register localhost:3000 as a valid authentication
 target. To do so add the following sections under config.yaml:

.. code-block:: yaml

    web:
      allowedOrigins: ["*"]
    staticClients:
      - id: metalk8s-ui
        name: MetalK8s UI
        redirectURIs:
          - https://<bootstrap_control_plane_ip>:8443/
          - http://localhost:3000/
        secret: ybrMJpVMQxsiZw26MhJzCjA2ut

You can retrieve the ``bootstrap_control_plane_ip`` by running:

.. code-block:: console

    salt-call grains.get metalk8s:control_plane_ip

#. Apply the changes using Salt:

.. code-block:: console

    VERSION="your version (e.g. 2.9.1-dev)"
    SALT_MASTER=$(kubectl \
        --kubeconfig /etc/kubernetes/admin.conf get pods \
        -n kube-system -l app=salt-master \
        -o jsonpath='{.items[0].metadata.name}')
    kubectl --kubeconfig /etc/kubernetes/admin.conf exec \
        "$SALT_MASTER" -c salt-master -n kube-system -- \
        salt-run state.sls metalk8s.addons.dex.deployed saltenv=metalk8s-$VERSION

#. Enable CORS requests:

.. code-block:: console

    kubectl --kubeconfig /etc/kubernetes/admin.conf patch ingress \
        -n metalk8s-ui \
        metalk8s-ui-proxies-https \
        --patch '{
            "metadata": {
                "annotations": {
                    "nginx.ingress.kubernetes.io/enable-cors": "true",
                    "nginx.ingress.kubernetes.io/cors-allow-headers":
                    "DNT,X-CustomHeader,Keep-Alive,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Authorization,x-auth-token"
                }
            }
        }'

    kubectl --kubeconfig /etc/kubernetes/admin.conf patch ingress \
        -n metalk8s-ui \
        metalk8s-ui-proxies-http \
        --patch '{
            "metadata": {
                "annotations": {
                    "nginx.ingress.kubernetes.io/enable-cors": "true",
                    "nginx.ingress.kubernetes.io/cors-allow-headers":
                    "DNT,X-CustomHeader,Keep-Alive,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Authorization,x-auth-token"
                }
            }
        }'


#. In `webpack.dev.js` edit the value of `controlPlaneIP` and provide
   your cluster bootstrap node's control plane IP

#. Run the UI with ``cd ui; npm run start``
