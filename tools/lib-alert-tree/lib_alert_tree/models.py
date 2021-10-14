"""Classes for manipulating tree-like hierarchies of alerts."""

import abc
import enum

from treelib import Tree

try:
    import click
except ImportError:
    CLICK_AVAILABLE = False
else:
    CLICK_AVAILABLE = True

from . import prometheus

ALLOWED_SEVERITIES = frozenset(["critical", "warning"])


class BaseAlert(metaclass=abc.ABCMeta):
    """Base-class for alert models."""

    name: str

    @property
    @abc.abstractmethod
    def alert_rule(self):
        """Generate a 'prometheus.AlertRule' corresponding to this model."""
        raise NotImplementedError()

    @property
    def query(self):
        """A PromQL query to retrieve the alert represented by this model."""
        return self.alert_rule.query

    @property
    def json_path(self):
        """A JSON Path filter to retrieve the alert represented by this model."""
        return self.alert_rule.child_json_path

    def __repr__(self):
        return f"{self.__class__.__qualname__}<{self!s}>"

    def __str__(self):
        return self.alert_rule.child_id

    @property
    def pretty_str(self):
        """A colored string (based on severity), if Click is available."""
        if not CLICK_AVAILABLE:
            return str(self)

        labels = dict(**self.alert_rule.labels)
        severity = labels.pop("severity")
        colors = {"warning": "yellow", "critical": "red"}

        parts = [click.style(self.name, bold=True, fg=colors[severity])]
        if labels:
            parts.append(" {")
            parts.append(
                ", ".join(
                    f"{key} = '" + click.style(value, bold=True) + "'"
                    for key, value in labels.items()
                )
            )
            parts.append("}")

        return "".join(parts)

    def create_node(self, tree, parent=None):
        """Add this alert to a tree."""
        return tree.create_node(str(self), parent=parent, data=self)

    @classmethod
    def warning(cls, name, **kwargs):
        """Helper to generate an alert with "warning" severity."""
        return cls(name, severity="warning", **kwargs)

    @classmethod
    def critical(cls, name, **kwargs):
        """Helper to generate an alert with "critical" severity."""
        return cls(name, severity="critical", **kwargs)


class ExistingAlert(BaseAlert):
    """A leaf in a tree of logical alerts.

    In essence, this represents an already existing alert rule in some Prometheus
    configuration, from which we will build composition rules. It only stores a name
    and a sufficient set of labels for querying.
    """

    def __init__(self, name, severity=None, **labels):
        self.name = name
        self.labels = labels

        if severity is not None:
            if severity not in ALLOWED_SEVERITIES:
                raise ValueError(f"Unsupported severity: {severity!r}")
            self.labels["severity"] = severity

    @property
    def alert_rule(self):
        return prometheus.AlertRule(self.name, labels=self.labels)


class Relationship(enum.Enum):
    """The type of relationship a parent has towards its children."""

    ALL = enum.auto()
    ANY = enum.auto()

    def build_query(self, children, group_by=None):
        """Build a query to derive an alert rule from its children."""
        if self == self.ALL:
            join_by = " and "
        elif self == self.ANY:
            join_by = " or "

        prefix = f"sum by ({', '.join(group_by)}) " if group_by else "sum"
        children_query = join_by.join(child.query for child in children)
        return f"{prefix}({children_query}) >= 1"

    @staticmethod
    def build_json_path(children, group_by=None):
        """Build a JSON Path to retrieve alert children."""
        json_path_filters = " || ".join(child.json_path for child in children)

        if group_by:
            group_filters = " && ".join(
                f"@.labels.{key} === '{{{{ $labels.{key} }}}}'" for key in group_by
            )
            return f"$[?(({json_path_filters}) && ({group_filters}))]"

        return f"$[?({json_path_filters})]"


class DerivedAlert(BaseAlert):
    """A non-leaf node (logical) in a tree of alerts.

    This is a computed alert rule, which maps a list of weighted edges towards other
    nodes (leaves or not) with a single alert.

    In practice, one can fully build up a tree using a `DerivedAlert` instance as the
    root, using the `build_tree` method.
    """

    def __init__(self, name, children, relationship, group_by=None, **params):
        self.name = name
        self.children = children
        if not isinstance(relationship, Relationship):
            raise ValueError(
                f"'relationship' must be an instance of {Relationship!r}, "
                f"got {relationship!r}"
            )
        self.relationship = relationship
        self.group_by = group_by
        self.params = params

    def build_tree(self, parent=None, tree=None):
        """Build a 'treelib.Tree' object by recursing through children."""
        if tree is None:
            tree = Tree()

        root = self.create_node(tree, parent=parent)

        for alert in self.children:
            if isinstance(alert, DerivedAlert):
                alert.build_tree(parent=root, tree=tree)
            else:
                alert.create_node(tree, parent=root)

        return tree

    @property
    def alert_rule(self):
        self.params.setdefault("annotations", {}).update(
            {
                "children": ", ".join(map(str, self.children)),
                "childrenJsonPath": self.relationship.build_json_path(
                    self.children, self.group_by
                ),
            }
        )
        return prometheus.AlertRule(
            name=self.name,
            expr=self.relationship.build_query(self.children, self.group_by),
            **self.params,
        )

    def build_rules_group(self, name):
        """Build a 'prometheus.RulesGroup' from all linked DerivedAlerts."""
        tree = self.build_tree()

        derived_alerts = tree.filter_nodes(
            lambda node: isinstance(node.data, DerivedAlert)
        )
        alert_rules = [a.data.alert_rule for a in derived_alerts]

        return prometheus.RulesGroup(name, rules=alert_rules)


# Utility methods


def severity_pair(
    name,
    summary_name=None,
    summary_plural=False,
    warning_children=None,
    critical_children=None,
    **kwargs,
):
    """Generate a pair of DerivedAlerts with 'warning' and 'critical' severity."""
    summary_text = f"{summary_name or name} {'are' if summary_plural else 'is'}"
    if warning_children:
        warning_alert = DerivedAlert.warning(
            f"{name}Degraded",
            children=warning_children,
            summary=f"{summary_text} degraded.",
            **kwargs,
        )
    else:
        warning_alert = None

    if critical_children:
        critical_alert = DerivedAlert.critical(
            f"{name}AtRisk",
            children=critical_children,
            summary=f"{summary_text} at risk.",
            **kwargs,
        )
    else:
        critical_alert = None

    return warning_alert, critical_alert
