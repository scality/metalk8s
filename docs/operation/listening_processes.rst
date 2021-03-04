Listening Processes
===================

In MetalK8s context several processes are deployed and they need to communicate
with each other, sometimes locally, sometimes between machines in the cluster,
or with the end user.

Depending on their :ref:`roles <node-roles>`, nodes must have
several addresses available for MetalK8s processes to bind.

.. jinja:: salt_values

   {%- for role, info in listening_processes.items() %}

   {% if role == "node" %}
     {%- set role = "all" %}
   {%- endif %}
   Listening Processes on {{ role | capitalize }} Nodes
   ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

   .. csv-table::
      :header: "Address", "Description"
      :width: 100%

      {% for address, process in info.items() %}
      "{{ address }}", "{{ process["description"] }}"
      {%- endfor %}

   {%- endfor %}
