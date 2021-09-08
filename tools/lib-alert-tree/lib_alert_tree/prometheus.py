"""Classes for storing and serializing Prometheus alert rules."""

import abc

import yaml


class Serializable(metaclass=abc.ABCMeta):
    """Base-class for data serializable into YAML strings."""

    @abc.abstractmethod
    def serialize(self):
        """Serialize this data container into a dict."""
        return {}

    def dump(self, out=None):
        """Dump the serialized data in YAML format."""
        return yaml.safe_dump(
            self.serialize(), stream=out, sort_keys=True, default_flow_style=False
        )

    def __repr__(self):
        return self.dump()


class AlertRule(Serializable):
    """A single alerting rule."""

    def __init__(
        self,
        name,
        expr=None,
        duration=None,
        annotations=None,
        labels=None,
        severity=None,
        summary=None,
    ):
        self.name = name
        self.expr = expr
        self.duration = duration
        self.labels = labels or {}
        self.annotations = annotations or {}

        if severity:
            self.labels["severity"] = severity

        if summary:
            self.annotations["summary"] = summary

    def serialize(self):
        for attr in ["expr", "duration"]:
            assert (
                getattr(self, attr) is not None
            ), f"Cannot serialize '{self.name}': `{attr}` must not be None"

        return {
            "alert": self.name,
            "expr": self.expr,
            "for": self.duration,
            "annotations": self.annotations,
            "labels": self.labels,
        }


class RulesGroup(Serializable):
    """A group of alerting rules."""

    def __init__(self, name, rules=None):
        self.rules = rules or []
        self.name = name

    def serialize(self):
        return {
            "name": self.name,
            "rules": [r.serialize() for r in self.rules],
        }


class PrometheusRule(Serializable):
    """A complete PrometheusRule custom resource."""

    def __init__(self, name, namespace, labels=None, groups=None):
        self.name = name
        self.namespace = namespace
        self.labels = labels or {}
        self.groups = groups or []

    def serialize(self):
        return {
            "apiVersion": "monitoring.coreos.com/v1",
            "kind": "PrometheusRule",
            "metadata": {
                "labels": self.labels,
                "name": self.name,
                "namespace": self.namespace,
            },
            "spec": {"groups": [g.serialize() for g in self.groups]},
        }
