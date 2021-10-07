"""Generate a Click command-line interface from alert trees."""

import sys

import click
from treelib import Tree

from .models import DerivedAlert
from .prometheus import PrometheusRule


def generate_cli(roots, prometheus_rule_labels=None):
    """Generate a CLI from a dict of root alerts (keys are used for root selection)."""
    try:
        assert next(iter(roots.values()))
    except (TypeError, AssertionError) as exc:
        raise ValueError(
            f"Must provide at least one root alert, got roots = {roots!r}"
        ) from exc

    root_names = list(roots.keys())

    @click.group()
    def cli():
        pass

    @cli.command()
    @click.option(
        "-r",
        "--root",
        "selected_roots",
        default=root_names,
        type=click.Choice(root_names),
        multiple=True,
        help=(
            "Root alerts for which to show the tree (or subtree). "
            "Defaults to all roots selected."
        ),
    )
    @click.option(
        "-a",
        "--alert",
        "alertname",
        help="Only show subtrees for alerts with this name",
    )
    @click.option(
        "-d",
        "--depth",
        default=-1,
        type=click.IntRange(min=-1, clamp=True),
        help=(
            "Depth at which to cut off the tree (from the root). Negative values "
            "disable the cutoff (which is the default)."
        ),
    )
    @click.option("--pretty/--no-pretty", default=True)
    def show(selected_roots, alertname, depth, pretty):
        tree = Tree()

        if len(selected_roots) > 1:
            root_data = lambda: None
            root_data.pretty_str = click.style("[root]", fg=8)
            root = tree.create_node("[root]", data=root_data)

            if depth >= 0:
                depth += 1  # We insert a level to group roots together

            found_alert = False
            for selected in selected_roots:
                try:
                    alert = _find_alert(roots[selected], alertname)
                except KeyError:
                    continue
                found_alert = True
                alert.build_tree(tree=tree, parent=root)

            if not found_alert:
                raise click.ClickException(
                    f"Failed to find an alert with name '{alertname}' in selected "
                    f"roots: {', '.join(selected_roots)}"
                )

        else:
            assert selected_roots, "Must select at least one root alert to build a tree"
            try:
                alert = _find_alert(roots[selected_roots[0]], alertname)
            except KeyError as exc:
                raise click.ClickException(
                    f"Failed to find an alert with name '{alertname}' in selected "
                    f"root: {selected_roots[0]}"
                ) from exc

            alert.build_tree(tree=tree)

        kwargs = {}
        if depth >= 0:
            kwargs["filter"] = lambda node: tree.level(node.identifier) <= depth
        if pretty:
            kwargs["data_property"] = "pretty_str"

        tree.show(**kwargs)

    @cli.command(name="gen-rule")
    @click.option(
        "-n",
        "--name",
        default="alert-tree.rules",
        help="Name of the PrometheusRule object to generate",
    )
    @click.option(
        "--namespace",
        help=(
            "Namespace for the PrometheusRule manifest (can be omitted and defined at "
            "apply-time)"
        ),
    )
    @click.option(
        "-r",
        "--root",
        "selected_roots",
        default=root_names,
        type=click.Choice(root_names),
        multiple=True,
    )
    @click.option("-o", "--out", type=click.File("w"), default=sys.stdout)
    def gen_rule(name, namespace, out, selected_roots):
        groups = [
            alert.build_rules_group(f"{alert_name}.rules")
            for alert_name, alert in roots.items()
            if alert_name in selected_roots
        ]
        prometheus_rule = PrometheusRule(
            name, namespace, labels=prometheus_rule_labels, groups=groups
        )
        prometheus_rule.dump(out=out)

    return cli


# Helpers


def _find_alert(root, alert):
    if alert is None:
        return root

    root_tree = root.build_tree()
    candidates = root_tree.filter_nodes(
        lambda node: isinstance(node.data, DerivedAlert) and node.data.name == alert
    )

    try:
        (found_alert,) = candidates
    except ValueError as exc:
        raise KeyError(
            f"Found {len(list(candidates))} logical alert(s) with name '{alert}', "
            "need a single match"
        ) from exc

    return found_alert.data
