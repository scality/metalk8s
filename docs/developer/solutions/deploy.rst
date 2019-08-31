Deploying And Experimenting
============================

Given the solution ISO is correctly generated, a script utiliy has been
added to enable solution install and removal

Installation
------------

Use the `solution-manager.sh` script to install a new solution ISO using
the following command

  .. code::

    /src/scality/metalk8s-X.X.X/solution-manager.sh -a/--add </path/to/new/ISO>

Removal
-------

To remove a solution from the cluster use the previous script by invoking

  .. code::

     /src/scality/metalk8s-X.X.X/solution-manager.sh -d/--del </path/to/ISO>

