Continuous Testing
==================

Add a new test in the continuous integration system
---------------------------------------------------

When we refer to test, at continuous integration system level, it means an
end-to-end task (building, linting, testing, ...) that requires a dedicated
environment, with one or several machines (virtual or container).

A test that only checks a specific feature of a classic MetalK8s deployment
should be part of PyTest BDD and not integrated as a dedicated stage in
continuous integration system (e.g.: Testing that Ingress Pod are running and
ready is a feature of MetalK8s that should be tested in PyTest BDD and not
directly as a stage in continuous integration system).

How to choose between Pre-merge and Post-merge
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

The choice really depends on the goals of this test.

As a high-level view:

Pre-merge:

- Test is usually not long and could last less than 30 minutes.
- Test essential features of the product (installation, expansion, building,
  ...).

Post-merge:

- Test last longer (more than 30 minutes).
- Test "non-essential" (not mandatory to have a working cluster)
  feature of the product (upgrade, downgrade, solutions, ...).

How to add a stage in continuous integration system
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

Continuous integration system is controlled by the ``eve/main.yml`` YAML file.

A stage is defined by a worker and a list of steps. Each stage should be in
the ``stages`` section and triggered by ``pre-merge`` or ``post-merge``.

To know the different kind of workers available, all the builtin steps, how to
trigger a stage, ... please refer to the eve documentation.

A test stage in MetalK8s context
""""""""""""""""""""""""""""""""

In MetalK8s context each test stage (eve stage that represents a full test)
should generate a status file containing the result of the test, either a
success or a failure, and a JUnit file containing the result of the test
and information about this test.

To generate the JUnit file, each stage needs the following information:

- The name of the Test Suite this test stage is part of
- Section path to group tests in a Test Suite if needed (optional)
- A test name

Before executing all the steps of the test we first generate a failed
result and at the end of the test we generate a success result. So that the
failed result get overridden by the success one if everything goes well.

At the very end, the final status of a test should be uploaded no matter the
outcome of the test.

To generate these results, we already have several helpers available.

Example:

Consider we want a new test named ``My Test`` which is part of
the subsection ``My sub section`` of the section ``My section`` in the
test suite ``My Test Suite``.

.. note::

  Test, suite and class names are not case sensitive in ``eve/main.yml``.

.. code-block:: yaml

  my-stage:
    _metalk8s_internal_info:
      junit_info: &_my_stage_junit_info
        TEST_SUITE: my test suite
        CLASS_NAME: my section.my sub section
        TEST_NAME: my test
    worker:
      # ...
      # Worker informations
      # ...
    steps:
      - Git: *git_pull
      - ShellCommand: # Generate a failed final status
          <<: *add_final_status_artifact_failed
          env:
            <<: *_env_final_status_artifact_failed
            <<: *_my_stage_junit_info
            STEP_NAME: my-stage
       # ...
       # All test steps should be here !
       # ...
       - ShellCommand: # Generate a success final status
         <<: *add_final_status_artifact_success
         env:
           <<: *_env_final_status_artifact_success
           <<: *_my_stage_junit_info
           STEP_NAME: my-stage
       - Upload: *upload_final_status_artifact

TestRail upload
"""""""""""""""

To store results, we use TestRail which is a declarative engine.
It means that all test suites, plans, cases, runs, etc. must be declared,
before proceeding to the results upload.

.. warning::

  TestRail upload is only done for Post-merge as we do not want to
  store each and every test result coming from branches with on-going work.

  Do not follow this section if it's not a Post-merge test stage.

The file ``eve/testrail_description_file.yaml`` contains all the TestRail
object declarations, that will be created automatically during Post-merge
stage execution.

It's a YAML file used by TestRail UI to describe the objects.

Example:

.. code-block:: yaml

   My Test Suite:
     description: >-
       My first test suite description
     section:
       My Section:
         description: >-
           My first section description
         sub_sections:
           My sub section:
             description: >-
               My first sub secttion description
             cases:
               My test: {}
             # sub_sections:  <-- subsections can be nested as deep as needed
