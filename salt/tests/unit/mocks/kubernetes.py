"""Mocked implementations of Kubernetes API for use in unit tests.

Aims to provide a simple yet configurable implementation of CRUD methods,
allowing to keep track of actions in an in-memory "database" or trigger
arbitrary problems for specific test needs.
"""
import contextlib
import copy
from unittest.mock import MagicMock, patch

from salt.exceptions import CommandExecutionError
from salt.utils import dictupdate

from tests.unit import utils


class ResourceFilter:
    """Helper object for filtering a list of resource instances."""

    NAMED_FILTERS = {
        "name": lambda i, v: i["metadata"]["name"] == v,
        "namespace": lambda i, v: i["metadata"]["namespace"] == v,
    }

    def __init__(self, instances):
        self.instances = instances

    def filter(self, name, value):
        if name in ResourceFilter.NAMED_FILTERS:
            return [
                i
                for i in self.instances
                if ResourceFilter.NAMED_FILTERS[name](i, value)
            ]

        if callable(value):
            return [i for i in self.instances if value(i)]

        return [i for i in self.instances if utils.get_dict_element(i, name) == value]

    def filter_update(self, name, value):
        self.instances = self.filter(name, value)


class APIMock:
    """Mock a K8s-style REST API over a set of resources stored in a dict."""

    def __init__(self, database=None):
        self.database = database or {}

    @property
    def api_resources(self):
        return list(self.database.keys())

    def filter(self, instances, filters):
        filtered = ResourceFilter(instances)

        for name, value in filters.items():
            filtered.filter_update(name, value)

        return filtered.instances

    def retrieve(self, resource, **filters):
        instances = self.database.get(resource, None)

        assert instances is not None, "Resource '{}' unknown (available: {})".format(
            resource, ", ".join(self.api_resources)
        )

        return self.filter(instances, filters)

    def get_instance(self, resource, instance):
        filters = {
            "name": instance["metadata"]["name"],
        }
        namespace = instance["metadata"].get("namespace")
        if namespace is not None:
            filters["namespace"] = namespace

        candidates = self.retrieve(resource, **filters)
        return candidates[0] if candidates else None

    def create(self, resource, instance):
        existing = self.get_instance(resource, instance)
        assert existing is None, "Cannot create '{}/{}': already exists.".format(
            resource, instance["metadata"]["name"]
        )

        self.database.setdefault(resource, []).append(instance)

    def update(self, resource, instance):
        existing = self.get_instance(resource, instance)
        assert existing is not None, "Cannot update '{}/{}': not found.".format(
            resource, instance["metadata"]["name"]
        )

        self.database[resource].remove(existing)
        self.database[resource].append(instance)

    def delete(self, resource, **filters):
        for to_remove in self.retrieve(resource, **filters):
            self.database[resource].remove(to_remove)

    def patch(self, resource, name, patch, **filters):
        candidates = self.retrieve(resource, name=name, **filters)
        assert (
            len(candidates) == 1
        ), "Found more than one instance of '{}/{}' to patch".format(resource, name)

        updated = dictupdate.update(candidates[0], patch)
        self.update(resource, updated)


class KubernetesAPIMock:
    """Add simple helpers to mock `metalk8s_kubernetes` methods in tests.

    Manages a set of resources (e.g. "pods") and the corresponding instances,
    and provides mocked equivalents for `metalk8s_kubernetes` methods relying
    on the managed resources.

    TODO:
    - add mock implementation for all methods from metalk8s_kubernetes
    - add helpers for manipulating the database
    - add helpers for populating the database
    """

    def __init__(self, database=None, resources=None):
        self.api = APIMock(database or {})

        # resources contains the mapping between short resource names, used as
        # keys in the DATABASE, and (kind / apiVersion) pairs used when
        # interacting with the real K8s API
        self.resources = resources or {}

    def seed(self, database=None):
        self.api.database = copy.deepcopy(database or {})

    def time_mock_from_events(self, events):
        return TimedEventsMock(self.api, events)

    def get_resource(self, kind, apiVersion):
        resource = self.resources.get((apiVersion, kind), None)
        if resource is None:
            raise ValueError(
                "Unknown object type provided: {}/{}. Make sure it is"
                " registered properly".format(apiVersion, kind)
            )

        return resource

    def get_object(self, name, kind, apiVersion, **kwargs):
        try:
            resource = self.get_resource(kind, apiVersion)
        except ValueError as exc:
            raise CommandExecutionError("Invalid manifest") from exc

        objects = self.api.retrieve(resource, name=name, **kwargs)
        res = objects[0] if objects else None
        print(
            "Called get_object %s/%s name=%s kwargs=%r - %r"
            % (apiVersion, kind, name, kwargs, res)
        )
        if res and "raiseError" in res:
            raise CommandExecutionError(res["raiseError"])
        return res

    def list_objects(
        self, kind, apiVersion, all_namespaces=False, field_selector=None, **kwargs
    ):
        resource = self.get_resource(kind, apiVersion)

        # If namespace isn't in kwargs, then all members of the matching
        # resource (after other filters were applied) will get returned
        assert (
            all_namespaces or "namespace" in kwargs
        ), "Must either enable `all_namespaces` or pass a `namespace` kwarg"

        if field_selector is not None:
            # Naive re-implem
            key, _, value = field_selector.partition("=")
            if value is None:
                value = ""
            kwargs[key] = value

        res = self.api.retrieve(resource, **kwargs)
        print(
            "Called get_object %s/%s kwargs=%r - %r" % (apiVersion, kind, kwargs, res)
        )
        return res


class TimedEventsMock:
    """Store timed events to affect an APIMock and mock the `time` module."""

    def __init__(self, api, events):
        self.api = api
        self.events = events
        self._timer = 0
        self._time_mock = MagicMock(side_effect=self.get_time)
        self._sleep_mock = MagicMock(side_effect=self.fake_sleep)
        self._initialized = False

    @property
    def time(self):
        return self._time_mock

    @property
    def sleep(self):
        return self._sleep_mock

    def get_time(self, *_a, **_k):
        if not self._initialized:
            eventlist = self.events.get(0, [])
            for event in eventlist:
                self.handle_event(event)
            self._initialized = True

        return self._timer

    def fake_sleep(self, duration, *_a, **_k):
        print("Called time.sleep(%d) - now at %d" % (duration, self._timer))
        self.process_events(duration)
        self._timer += duration

    def process_events(self, duration):
        for timestep, eventlist in self.events.items():
            if self._timer < timestep <= self._timer + duration:
                for event in eventlist:
                    self.handle_event(event)

    def handle_event(self, event):
        print("Processing event %r" % event)
        kwargs = copy.deepcopy(event)
        resource = kwargs.pop("resource")
        verb = kwargs.pop("verb")

        method = getattr(self.api, verb)
        method(resource, **kwargs)
        print("Done")

    @contextlib.contextmanager
    def patch(self):
        with patch("time.time", self.time), patch("time.sleep", self.sleep):
            yield
