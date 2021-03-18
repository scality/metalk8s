Salt Formulas Unit Testing
==========================

Introduction
------------
This test suite aims to provide full coverage of Salt formulas rendering,
intending to protect formula designers from avoidable mistakes.

The tests are built using:

- ``pytest`` fixtures to simulate a real rendering context
- ``jinja2`` as a library, to extract the Jinja AST and infer coverage from
  rendering passes (more renderers may be covered in the future, if the need
  arises)

Goals / Non-goals
-----------------
The tests written here are designed as **unit tests**, covering only the
rendering functionality.

As such, a test will ensure that the *render-time* behaviour is tested (and
all branches are covered), and will verify the result's validity.

Providing coverage information will be paramount, to build the desired
protection (enforcing coverage will also improve the confidence in newly
created formulas).

These tests do not include integration or end-to-end evaluation of the
formulas.
Checking the validity of the rendered contents is only a possibility, and not
a primary goal for this test suite.

Implementation Plan
-------------------

Generic Test Behaviour
^^^^^^^^^^^^^^^^^^^^^^
Every rendering test will behave the same way:

#. Set up test fixtures
#. Read a formula
#. Render it from the desired context
#. Run some validity check(s) on the result

Configuration
^^^^^^^^^^^^^
Not all formulas are made the same, and some will only be renderable in
specific contexts.

To handle this situation, we define a series of supported context options to
customize the `test fixtures <Fixtures>`_, and a configuration file for
describing the context(s) supported by each formula.

Since we do not want to specify these for each and every formula, we define a
configuration structure, based on YAML, which builds on the natural hierarchy
of our Salt formulas.

Each level in the hierarchy can define test cases, with the special ``_cases``
key. This key contains a map, where keys are (partial) test case identifiers,
and values are describing the context for each test case. The root-level
``default_case`` defines the default test case applied to all tests, unless
specified otherwise. The ``default_case`` also serves as default configuration
of any test case from which overrides are applied.

Assuming we have some options for specifying the target minion's OS and its
configured Volumes, here is how we could use these in a configuration file:

.. code-block:: yaml

   default_case:
     os: CentOS/7
     volumes: none

   map.jinja:
     # All cases defined here will use `volumes = "none"`
     _cases:
       "CentOS 7":
         os: CentOS/7
       "RHEL 7":
         os: RHEL/7
       "RHEL 8":
         os: RHEL/8
       "Ubuntu 18":
         os: Ubuntu/18

   volumes:
     prepared.sls:
       # All cases defined here will use `os = "CentOS/7"`
       _cases:
         "No Volume to prepare":
           volumes: none
         "Only sparse Volumes to prepare":
           volumes: sparse
         "Only block Volumes to prepare":
           volumes: block
         "Mix of sparse and block Volumes to prepare":
           volumes: mix

To further generate interesting test cases, each entry in the ``_cases`` map
supports a ``_subcases`` key, which then behaves as a basic ``_cases`` map.
Assuming we have options for choosing a deployment architecture and for
passing overrides to the available pillar, here is how it could look like:

.. code-block:: yaml

   _cases:
     "Single node":
       architecture: single-node
       _subcases:
         "Bootstrapping (no nodes in pillar)":
           pillar_overrides:
             metalk8s: { nodes: {} }
         "Version mismatch":
           pillar_overrides:
             metalk8s:
               nodes:
                 bootstrap:
                   version: 2.6.0

     "Multi nodes":
       architecture: multi-nodes
       _subcases:
         # No additional option
         "All minions match": {}
         "Some minion versions mismatch":
           pillar_overrides:
             metalk8s:
               nodes:
                 master-1:
                   version: 2.6.0
         "All minion versions mismatch":
           pillar_overrides:
             metalk8s:
               nodes:
                 bootstrap:
                   version: 2.6.0
                 master-1:
                   version: 2.6.0
                 master-2:
                   version: 2.6.0

The full configuration currently used is
:ref:`included below for reference <formulas-unit-tests-config>`.

Fixtures
^^^^^^^^
Formulas require some context to be available to render.
This context includes:

- Static information, like ``grains`` or ``pillar`` data
- Dynamic methods, through ``salt`` execution modules
- Extended Jinja functionality, through custom filters (likely provided by
  Salt)

The ``pytest`` fixtures defined with the tests should allow to setup a
rendering context through composition. Dynamic ``salt`` functions should
attempt to derive their results from other static fixtures when possible.

Validity
^^^^^^^^

.. important:: This is not yet implemented.

The result of a formula rendering shall be validated by the tests.
As most formulas use the ``jinja|yaml`` rendering pipeline, the first validity
check implemented will only attempt to load the result as a YAML data
structure.

Later improvements may add:

- Structure validation (result is a map of string keys to list values, where
  each list contains either strings or single-key maps)
- Resolution of ``include`` statements
- Validity of requisite IDs (``require``, ``onchanges``, etc.)

Coverage
^^^^^^^^

.. important:: This is not yet implemented.

Obtaining coverage information for non-Python code is not straightforward.
In the context of Jinja templates, some existing attempts can be found:

- `jinja_coverage <https://github.com/MrSenko/coverage-jinja-plugin>`_ is not
  maintained, though should give useful pointers
- `django_coverage_plugin <https://github.com/nedbat/django_coverage_plugin>`_
  is another interesting take, though likely too specific to Django

Given the above, we will need to create our own coverage plugin suited to our
needs.
Initial research shows however that all the required information may not be
easily accessed from the Jinja library. See:

- `pallets/jinja#408 <https://github.com/pallets/jinja/issues/408>`_
- `pallets/jinja#674 <https://github.com/pallets/jinja/pull/674>`_
- `pallets/jinja#1130 <https://github.com/pallets/jinja/issues/1130>`_

Macros Testing
^^^^^^^^^^^^^^

.. important:: This is not yet implemented.

Another aspect we can address with these tests is unit-testing of Jinja
macros. This will ensure macros behaviour remains stable over time, and that
their intent is clearly expressed in test cases.

To perform such unit-testing, one may approach it as follows:

.. code-block:: python

   from jinja2 import Environment

   env = Environment(loader=FilesystemLoader('salt'))
   macro_tpl = env.get_template('metalk8s/macro.sls')

   # This is the exported `pkg_installed` macro
   pkg_installed = macro_tpl.module.pkg_installed

Reference
---------

.. _formulas-unit-tests-config:

Tests Configuration
^^^^^^^^^^^^^^^^^^^
The configuration of rendering tests can be found at
``salt/tests/unit/formulas/config.yaml``, and is included below for reference:

.. literalinclude:: ../../../../salt/tests/unit/formulas/config.yaml
   :language: YAML
