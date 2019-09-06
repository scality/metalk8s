Running the platform UI locally
===============================

Requirements
------------

- `Node.js <https://nodejs.org/en/>`_, 10.16

Prerequisites
-------------

- You should have a running Metalk8s cluster somewhere
- You should have installed the dependencies locally with
  ``cd ui; npm install``

Procedure
---------


1. Connect to the boostrap node of your cluster, and execute the following
   command as root:

.. code-block:: console

   python - <<EOF
   import subprocess
   import json

   output = subprocess.check_output([
       'salt-call', 'pillar.get', 'metalk8s', '--out', 'json'
   ])
   pillar = json.loads(output)['local']
   ui_conf = {
       'url': 'https://{}:6443'.format(pillar['api_server']['host']),
       'url_salt': 'https://{salt[ip]}:{salt[ports][api]}'.format(
           salt=pillar['endpoints']['salt-master']
       ),
       'url_prometheus': 'http://{prom[ip]}:{prom[ports][api][node_port]}'.format(
           prom=pillar['endpoints']['prometheus']
       ),
   }
   print(json.dumps(ui_conf, indent=4))
   EOF


2. Copy the output into ``ui/public/config.json``.

3. Run the UI with ``cd ui; npm run start``
