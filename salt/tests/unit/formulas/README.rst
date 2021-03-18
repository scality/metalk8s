Salt Formulas Unit Testing
==========================

See the detailed design document
`here <../../../../docs/developer/development/testing/formulas-unit.rst>`_.

To run these tests independently, use::

   tox -e unit-tests -- -m formulas

.. warning::

   When running the formula rendering tests in isolation from other unit tests,
   coverage report will show many missed lines in ``salt/_modules``. This is
   expected for now, as we did not want to use an independent ``tox``
   environment.
