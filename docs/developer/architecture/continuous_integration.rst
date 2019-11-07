MetalK8s Continuous Integration
===============================

To provide confidence in the quality of MetalK8s releases (and intermediary
states), both for developers and users, the project uses a set of test suites
and build systems in conjunction with Scality’s usual Git Waterflow VCS
strategy, as well as RelEng’s Bert-E + Eve combo for automation.
This document highlights requirements for the complete system, but mostly
focuses on implementation strategies for code in the realm of the
scality/metalk8s repository.


Requirements
------------

.. todo::

   - High-level goals, e.g. productivity, confidence, maintainability
   - Specific performance/quality indicators to monitor (with actual values?)

High-level objectives
^^^^^^^^^^^^^^^^^^^^^

Continuous Integration, or CI, generally refers to a system helping developers
to continuously integrate (surprising, given the name) incremental changes to a
code base.

In our case, the systems and tools put in place to cover this task will not
only serve as an automation of the code patch integration process, but will
also have the following responsibilities:

- Ensure **quality** of the integrated code base, by running test suites before
  (and optionally after) the integration of changes
- Increase the **productivity** of developers, by reducing the risk of
  introducing bugs in the software, as well as running complex test setups that
  would otherwise consume a lot of each developer's time
- Help the **release process**, through the guarantee that merged code can
  always be built and is functional

As a side-effect, the automated build system produces artifacts for consumption
by users (e.g. product documentation) from any point in the code base history.

Product-specific objectives
^^^^^^^^^^^^^^^^^^^^^^^^^^^

.. todo::

   - performance monitoring
   - integration with external products (e.g. Solutions)

Current architecture
--------------------

.. todo::

   - Describe current pre-merge suite
   - Write down qualities and defects of the current implem

Infrastructure
^^^^^^^^^^^^^^

.. todo:: Eve/Bert-E, Git Waterflow, Artifacts...



Tests
^^^^^
.. todo:: pre-merge strategy

Reporting
^^^^^^^^^

.. todo:: mostly missing, mention TestRail / JUnit reports

Improvements
------------

.. todo::

   - Describe areas of improvement, w.r.t Requirements
   - Describe symptoms and counter-measures

Shortcomings of the current system
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

.. todo::

   - limitations of the tools and current validation tests,
   - performance/flakiness...

Suggestions
^^^^^^^^^^^

.. todo:: proposals to consider for extending the current system
