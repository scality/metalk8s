Shell-UI
========

Shell UI objectives is to provide a common authentication and navigation layer
for the different solutions UI.

The main idea is to provide the flexiblity to build an adptative UI depending
on the deployed Metalk8s solutions. Each solution could come with its own
specific UI and Shell UI will federate it in a single entry point.

To achieve this goal the current implementation is based on several components:
 - A configuration for Shell UI to define theme, navbar entries and enable
   additional features
 - A deployedUIApps list which later on would be automatically populated when a
   new solution is deployed. For now it is updated manually thanks to a salt
   state
 - Each solution UI contains 2 configuration files:

   - ``/.well-known/micro-app-configuration`` to define the solution views and
     features it exposes
   - ``/.well-known/runtime-app-configuration`` to define solution environment
     specific configuration as well as the solution authentication supported
     method

Shell UI supported authentication method is for now only based on OIDC.
For a Solution to define it's supported authentication method it should include
a section similar to the following in its
``/.well-known/runtime-app-configuration``:

.. code-block:: json

    "auth": {
      "kind": "OIDC",
      "providerUrl": "/oidc",
      "redirectUrl": "http://localhost:8084",
      "clientId": "metalk8s-ui",
      "responseType": "code",
      "scopes": "openid email profile",
      "providerLogout": false // Optional, when true the logout action will be propagated to the oidc provider and the remote session will be closed
    }

Navbar Updater Components
-------------------------

In the ``.well-known/micro-app-configuration`` file, a solution can define a
list of ``navbarUpdaterComponents``.

A ``navbarUpdaterComponent`` is desgined to be headless component that will be
rendered by Shell UI to update the navbar entries from the Solution UI code
base.
An example of it's usage can be found in the ``metalk8s-ui`` solution.
For eg. it powers the ``Notification Center`` feature where each of the
solution UI can notify the user about new events.

Instance Name
-------------

When several instances of Metalk8s are deployed it can be hard to distinguish
the different UIs for each site.
To help the user to know which UI they are currently using we have implemented
an optional ``instanceName`` feature that will be displayed in the navbar.

The instance name storage is delegated to the main solution UI deployed and
is currently not implemented by Metalk8s UI.
To implement it, the "main" solution UI (being the one with
``appHistoryBasePath == ""`` in the deployedUIApps list) should expose a
``/.well-known/micro-app-configuration`` file with the following content:

.. code-block:: json

    {
        "instanceNameAdapter": {
            "module": "./InstanceNameAdapter",
            "scope": "metalk8s"
        }
    }

The module ``./InstanceNameAdapter`` should export 2 functions allowing to
get and set the instance name.

You can find a sample in memory implementation below:

.. code-block:: javascript

    /**
    * This is an InstanceNameAdapter it has to export 2 functions
    * - getInstanceName: () => Promise<string>
    * - setInstanceName: (name: string) => Promise<void>
    */

    let instanceName = "My Metalk8s";

    export async function getInstanceName() {
        return instanceName;
    }

    export async function setInstanceName(name) {
        instanceName = name;
    }

