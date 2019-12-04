"""Base elements of a build plan declaration in eve/main.yml.

Higher-level concepts must use these blocks to generate a valid build plan.
"""

import abc
import collections
import enum
import operator

import yamlprint

class Project:
    """The root document rendered in `eve/main.yml` file."""

    def __init__(self):
        self._stages = []

    stages = property(operator.attrgetter("_stages"))

    def add(self, stage):
        existing_stage = next(
            (s for s in self.stages if s.name == stage.name), None
        )
        if existing_stage is not None:
            if hash(stage) != hash(existing_stage):
                raise ValueError(
                    "A stage with this name ({}) already exists and doesn't "
                    "match this one. Cannot override stages.".format(
                        stage.name
                    )
                )
            else:
                # No need to re-insert the stage or go further.
                return

        self.stages.append(stage)
        for new_stage in stage.dependencies:
            self.add(new_stage)

    @property
    def branches(self):
        return collections.OrderedDict(
            (", ".join(stage.branches), {"stage": stage.name})
            for stage in self.stages
            if stage.branches
        )

    def dump(self):
        return collections.OrderedDict(
            [
                ("version", "0.2"),
                ("branches", self.branches),
                (
                    "stages",
                    collections.OrderedDict(
                        (stage.name, stage.dump()) for stage in self.stages
                    ),
                ),
            ]
        )


class Stage:
    """A collection of Steps to run on a Worker."""

    def __init__(self, name, worker, steps, branches=None):
        self._name = name
        self._worker = worker
        self._steps = steps
        self._branches = branches or []

    def __hash__(self):
        return hash(yamlprint.dump(self.dump()))

    name = property(operator.attrgetter("_name"))
    worker = property(operator.attrgetter("_worker"))
    steps = property(operator.attrgetter("_steps"))
    branches = property(operator.attrgetter("_branches"))

    @property
    def dependencies(self):
        return [stage for step in self.steps for stage in step.stages]

    def dump(self):
        return collections.OrderedDict(
            [
                ("worker", self._worker.dump()),
                ("steps", [step.dump() for step in self.steps]),
            ]
        )


# Workers {{{
class Worker(metaclass=abc.ABCMeta):
    """A worker defines how/where to run a stage."""

    @abc.abstractmethod
    def dump(self):
        pass  # pragma: no cover


class LocalWorker(Worker):
    def dump(self):
        return collections.OrderedDict([("type", "local")])


class KubePodWorker(Worker):
    """Worker defined as a Kubernetes Pod."""

    class Image:
        """Container image description for KubePod workers."""

        def __init__(self, name, context, dockerfile=None):
            self._name = name
            self._context = context
            self._dockerfile = dockerfile

        name = property(operator.attrgetter("_name"))
        context = property(operator.attrgetter("_context"))
        dockerfile = property(operator.attrgetter("_dockerfile"))

        @property
        def info(self):
            if self.dockerfile is None:
                # Assume the context contains the Dockerfile, dump a string
                return self.context

            return collections.OrderedDict(
                [("context", self.context), ("dockerfile", self.dockerfile)]
            )

    def __init__(self, path, images):
        self._path = path
        self._images = collections.OrderedDict(
            (image.name, image.info) for image in images
        )

    path = property(operator.attrgetter("_path"))
    images = property(operator.attrgetter("_images"))

    def dump(self):
        return collections.OrderedDict(
            [
                ("type", "kube_pod"),
                ("path", self.path),
                ("images", self.images),
            ]
        )


class OpenStackWorker(Worker):
    class Image(enum.Enum):
        CENTOS7 = "CentOS-7-x86_64-GenericCloud-1809.qcow2"

    class Flavor(enum.Enum):
        SMALL = "m1.small"
        MEDIUM = "m1.medium"
        LARGE = "m1.large"
        XLARGE = "m1.xlarge"

    def __init__(self, path, image, flavor):
        self._path = path
        self._image = image
        self._flavor = flavor

    path = property(operator.attrgetter("_path"))
    image = property(operator.attrgetter("_image"))
    flavor = property(operator.attrgetter("_flavor"))

    def dump(self):
        return collections.OrderedDict(
            [
                ("type", "openstack"),
                ("path", self.path),
                ("image", self.image.value),
                ("flavor", self.flavor.value),
            ]
        )


# }}}
# Steps {{{
class Step(metaclass=abc.ABCMeta):
    """A step describes what needs to be executed within a stage."""

    # TODO: consider changing halt_on_failure default value to True
    def __init__(self, name, halt_on_failure=None, always_run=None):
        self._name = name
        self._halt_on_failure = halt_on_failure
        self._always_run = always_run

    name = property(operator.attrgetter("_name"))
    halt_on_failure = property(operator.attrgetter("_halt_on_failure"))
    always_run = property(operator.attrgetter("_always_run"))

    @property
    def stages(self):
        """List of stages that this steps requires.

        By default, it's always going to be an empty list.
        """
        return []

    @property
    def step_name(self):
        klass = self.__class__
        return getattr(klass, "STEP_NAME", klass.__qualname__)

    def dump(self):
        args = [("name", self.name), *self.dump_arguments()]

        if self.halt_on_failure is not None:
            args.append(("haltOnFailure", self.halt_on_failure))
        if self.always_run is not None:
            args.append(("alwaysRun", self.always_run))

        return {self.step_name: collections.OrderedDict(args)}

    @abc.abstractmethod
    def dump_arguments(self):
        """Dump the step's arguments as an iterable of 2-tuples."""
        return []  # pragma: no cover


class TriggerStages(Step):
    def __init__(self, name, stages, **kwargs):
        super(TriggerStages, self).__init__(name, **kwargs)
        self._stages = stages

    stages = property(operator.attrgetter("_stages"))

    def dump_arguments(self):
        return [("stage_names", [stage.name for stage in self.stages])]


class SetPropertyFromCommand(Step):
    def __init__(self, name, property_name, command, **kwargs):
        super(SetPropertyFromCommand, self).__init__(name, **kwargs)
        self._property_name = property_name
        self._command = command

    property_name = property(operator.attrgetter("_property_name"))
    command = property(operator.attrgetter("_command"))

    def dump_arguments(self):
        return [("property", self.property_name), ("command", self.command)]

# }}}
