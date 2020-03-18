Continuous Testing
==================


This document will not describe how to write a test but just the list of tests
that should be done and when.

The goal is to:

- have day-to-day development and PRs merged faster
- have a great test coverage

Lets define 2 differents stages of continuous testing:

- Pre-merge: Run during development process on changes not yet merged
- Post-merge: Run on changes already approved and merged in development
  branches

Pre-merge
---------

What should be tested in pre-merge on every branch used during development
(``user/*``, ``feature/*``, ``improvement/*``, ``bugfix/*``, ``w/*``).
The pre-merge test should not long too much time (less than 40 minutes
is great) so we can't test everything in pre-merge, we should only test
building of the product and check that product still usable.

- Building tests

  - Build
  - Lint
  - Unit tests

- Installation tests

  - Simple install RHEL
  - Simple install CentOs + expansion

When merging several pull requests at the same time, given that we are on a
queue branch (``q/*``), we may require additional tests as a combination of
several PRs could have a larger impact than all individual PR:

- Simple upgrade/downgrade

.. _post-merge:

Post-merge
----------

On each and every ``development/2.*`` branches we want to run complex tests,
that take more time or need more ressources than classic tests that run during
pre-merge, to ensure that the current product continues to work well.

Nightly
^^^^^^^

- Upgrade, downgrade tests:

  - For previous development branch

    e.g.: on ``development/2.x`` test upgrade from ``development/2.(x-1)``
    and downgrade to ``development/2.(x-1)``

    - Build branch ``development/2.(x-1)`` (or retrieve it if available)
    - Tests:

      - Single node test
      - Complex deployment test

  - For last released version of current minor

    e.g.: on ``development/2.x`` when developing "2.x.y-dev" test upgrade from
    ``metalk8s-2.x.(y-1)`` and downgrade to ``metalk8s-2.x.(y-1)``

    - Single node test
    - Complex deployment test

  - For last released version of previous minor

    e.g.: on ``development/2.x`` when developing "2.x.y-dev" test upgrade from
    ``metalk8s-2.(x-1).z`` and downgrade to ``metalk8s-2.(x-1).z`` where
    "2.(x-1).z" is the last patch released version for "2.(x-1)" (``z`` may be
    different from ``y``)

    - Single node test
    - Complex deployment test

- Backup, restore tests:

  - Environment with at least 3-node etcd cluster, destroy the bootstrap node
    and spawning a new fresh node for restoration
  - Environment with at least 3-node etcd cluster, destroy the bootstrap node
    and use one existing node for restoration

- Solutions tests

.. note::

  Complex deployment is (to be validated):

  - 1 bootstrap
  - 1 etcd and control
  - 1 etcd and control and workload
  - 1 workload and infra
  - 1 workload
  - 1 infra

.. todo::

   - Describe solutions tests (#1993)

Weekly
^^^^^^

More complex tests:

- Performance/conformance tests
- Validation of `contrib` tooling (Heat, terraform, ...)
- Installation of "real" Solution (Zenko, ...)
- Long lifecycle metalk8s tests (several upgrade, downgrade, backup/restore,
  expansions, ...)

.. todo::

  Validate the list of Weekly test to do and define exactly what need to be
  tested

Adaptive test plan
------------------

CI pre-merge may be more flexible by including some logic about the content
of the changeset.

The goal here is to test only what needed according to the content of the
commit.

For example:

- For a commit that changes uniquely documentation, we don't need to run the
  entire installation test suite but rather run tests related to documentation.
- For a commit touching upgrade orchestrate we want to test upgrade directly
  in pre-merge and not wait :ref:`Post merge<post-merge>` build to get the
  test result.

.. todo::

   Several questions:

   - How to get the change of one commit ?

     - Depending on the files changed

       - How do you know when you change something in salt if this changeset
         touch upgrade for example ?

         - ...

     - A tag in the commit message

       - maybe ?

   - How to get the bunch of commit to test ?

     - Get commit between HEAD and target branch

       - How to get this target ?

         - ...
