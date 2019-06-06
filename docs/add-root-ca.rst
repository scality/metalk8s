Add a root CA to the web browser
================================

.. todo::

  The following test has been realized on Vagrant only
  Web browsers version used for tests:

   * Googe Chrome: Version 75.0.3770.80
   * Mozilla Firefox: Version 67.0

Run the following command as ``root`` on the bootstrap node to copy the root CA
from the bootstrap on your host:

.. code-block:: shell

  $ scp /etc/kubernetes/pki/ca.crt <user>@<IP>:<directory>

Then go back on you host and open you web browser ton install the root CA.

Install on Google Chrome
------------------------

  * Open your web browser
  * Navigate on ``chrome://settings``
  * On the search setting bar, search ``manage certificates``.
  * Then go in the tab ``Authorities``, click on :kbd:`IMPORT`.
  * A new window appear, then find the directory where you upload the root CA
    then select.
  * A pop up apear to ask you to set the Trust settings:
  * Select the line ``Trust this certificate for identifying websites``,
    then click on :kbd:`OK` to confirm.

Install on Mozilla Firefox
--------------------------

  * Open your web browser
  * Navigate on ``about:preferences``
  * On the search bar, search ``certificates``. In the search result
  * click on the button :kbd:`View certificates...`
  * Go on the tab ``Authorities`` then click on :kbd:`IMPORT`
  * A new window appear, then find the directory where you upload the root CA
    then select.
  * A pop up apear to ask you to set the Trust settings:
  * Select the line ``Trust this CA for identifying websites``,
    then click on :kbd:`OK` to confirm.
