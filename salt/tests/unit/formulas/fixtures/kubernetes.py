"""Expose a really crude mock of K8s API for use in rendering tests."""

import collections
import re
from typing import Any, Dict, Iterator, List, Optional

import pytest


APIVersion = str
Kind = str
ItemList = List[Any]
K8sData = Dict[APIVersion, Dict[Kind, ItemList]]


# pylint: disable=too-few-public-methods
class KubernetesMock:
    """Simple object for mocking basic API calls on an in-memory K8s dataset."""

    Matcher = collections.namedtuple("Matcher", ("key", "op", "value"))

    def __init__(self, data: K8sData):
        self.data = data

    @staticmethod
    def _apply_matchers(objects: ItemList, matchers: List[Matcher]) -> Iterator[Any]:
        def _filter(item: Any) -> bool:
            matches = True
            for matcher in matchers:
                val = item
                for key in matcher.key:
                    val = val[key]
                if matcher.op == "=":
                    matches &= val == matcher.value
                elif matcher.op == "!=":
                    matches &= val != matcher.value
            return matches

        return filter(_filter, objects)

    def _get_item_list(self, api_version: APIVersion, kind: Kind) -> ItemList:
        try:
            item = self.data[api_version][kind]
        except KeyError:
            pytest.fail(f"No data in Kubernetes mock for '{api_version}/{kind}'")
        return item

    def get(
        self,
        api_version: APIVersion,
        kind: Kind,
        name: str,
        namespace: Optional[str] = None,
    ) -> Optional[Any]:
        """Retrieve an object from the data store."""
        items = self._get_item_list(api_version, kind)

        matchers = [self.Matcher(["metadata", "name"], "=", name)]
        if namespace is not None:
            matchers.append(self.Matcher(["metadata", "namespace"], "=", namespace))

        return next(self._apply_matchers(items, matchers), None)

    def list(
        self,
        api_version: APIVersion,
        kind: Kind,
        namespace: Optional[str] = None,
        label_selector: Optional[str] = None,
    ) -> List[Any]:
        """Retrieve a list of objects from the data store."""
        items = self._get_item_list(api_version, kind)

        matchers = []

        if namespace is not None:
            matchers.append(self.Matcher(["metadata", "namespace"], "=", namespace))

        if label_selector is not None:
            for match_expr in label_selector.split(","):
                match = re.match(
                    r"^(?P<key>.*[^!])(?P<op>!=|=)(?P<value>.+)$", match_expr
                )
                assert (
                    match is not None
                ), f"Invalid label selector expression: {match_expr}"
                matchers.append(
                    self.Matcher(
                        key=["metadata", "labels", match.group("key")],
                        op=match.group("op"),
                        value=match.group("value"),
                    )
                )

        return list(self._apply_matchers(items, matchers))
