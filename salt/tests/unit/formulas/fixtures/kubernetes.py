"""Expose a really crude mock of K8s API for use in rendering tests."""

from typing import Any, Dict, List, Optional

import pytest


APIVersion = str
Kind = str
ItemList = List[Any]
K8sData = Dict[APIVersion, Dict[Kind, ItemList]]


# pylint: disable=too-few-public-methods
class KubernetesMock:
    """Simple object for mocking basic API calls on an in-memory K8s dataset."""

    def __init__(self, data: K8sData):
        self.data = data

    def get(
        self,
        api_version: APIVersion,
        kind: Kind,
        name: str,
        namespace: Optional[str] = None,
    ) -> Optional[Any]:
        """Retrieve an object from the data store."""

        try:
            items = self.data[api_version][kind]
        except KeyError:
            pytest.fail(f"No data in Kubernetes mock for '{api_version}/{kind}'")

        def _filter(item: Any) -> bool:
            if namespace is not None and item["metadata"]["namespace"] != namespace:
                return False
            if item["metadata"]["name"] != name:
                return False
            return True

        return next(filter(_filter, items), None)
