Generating C4 Diagrams
======================

Model definitions are located in ``models/``.
Exported PlantUML definitions and rendered images are in ``diagrams/``.

Pre-requisites
--------------

- Download `Structurizr CLI <https://github.com/structurizr/cli>`_
- Install `PlantUML <https://plantuml.com/starting>`_

Creating or Editing a Model
---------------------------

Please refer to:

- `Getting started with Structurizr CLI and DSL`_
- `Structurizr DSL language reference`_

.. _Getting started with Structurizr CLI and DSL:
   https://github.com/structurizr/cli/blob/master/docs/getting-started.md
.. _Structurizr DSL language reference:
   https://github.com/structurizr/dsl/blob/master/docs/language-reference.md

Exporting to PlantUML
---------------------

To export PlantUML definitions from a model, run:

.. code::

   /path/to/structurizr.sh export \
       -workspace models/model.structurizr \
       -format plantuml/c4plantuml \
       -output diagrams/

This command will generate one PlantUML file for each view defined in
``models/model.structurizr``, each named
``diagrams/structurizr-<ViewName>.png``.

Rendering from PlantUML
-----------------------

To render a PlantUML definition, run:

.. code::

   plantuml -tpng diagrams/structurizr-<ViewName>.puml

This command will generate ``diagrams/structurizr-<ViewName>.png``.
