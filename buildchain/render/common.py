"""Options and helpers shared by the Helm and kustomize renderers."""

import pathlib
import sys

# Root of the MetalK8s repository.
REPO_ROOT = pathlib.Path(__file__).resolve().parents[2]

# Header and footer of the generated SLS files, around the manifests
START_BLOCK = """
#!jinja | metalk8s_kubernetes

{{%- from "metalk8s/map.jinja" import repo with context %}}
{csc_defaults}
{configlines}

{{% raw %}}
"""

END_BLOCK = """
{% endraw %}
"""


def add_arguments(parser):
    parser.add_argument(
        "-o", "--output", default="", help="Output file for SLS, default to stdout"
    )
    parser.add_argument(
        "--remove-manifest",
        action="append",
        nargs=2,
        dest="remove_manifests",
        metavar=("KIND", "NAME"),
        help="Remove a given manifest from the resulting SLS",
    )
    parser.add_argument(
        "--keep-manifest",
        action="append",
        nargs=2,
        dest="keep_manifests",
        metavar=("KIND", "NAME"),
        help="Keep only specified manifests in the resulting SLS "
        "(if set, all others are removed)",
    )


def matches(kind, name, manifests):
    """Tell if `kind` and `name` are in a list of `[KIND, NAME]` pairs."""
    return any([kind, name] == list(manifest) for manifest in manifests or [])


def is_selected(kind, name, keep_manifests, remove_manifests):
    """Apply the `--keep-manifest` and `--remove-manifest` options."""
    if matches(kind, name, remove_manifests):
        return False
    return not keep_manifests or matches(kind, name, keep_manifests)


def manifest_id(manifest):
    """Return the kind and name of a parsed manifest."""
    return manifest.get("kind"), (manifest.get("metadata") or {}).get("name")


def select_manifests(manifests, keep_manifests, remove_manifests, identify=manifest_id):
    """Apply the `--keep-manifest` and `--remove-manifest` options.

    `identify` returns the kind and name of a manifest, by default a parsed one.
    """
    # A typo in a name would silently keep or drop the wrong manifests
    wanted = (keep_manifests or []) + (remove_manifests or [])
    missing = {tuple(manifest) for manifest in wanted}
    selected = []
    for manifest in manifests:
        kind, name = identify(manifest)
        missing.discard((kind, name))
        if is_selected(kind, name, keep_manifests, remove_manifests):
            selected.append(manifest)

    if missing:
        raise ValueError(
            "Manifests not found in the rendered output: "
            + ", ".join(f"{kind}/{name}" for kind, name in sorted(missing))
        )

    return selected


def render_sls(manifests, csc_defaults="", configlines=""):
    """Put the manifests, a YAML stream ending with a newline, in a SLS file.

    `csc_defaults` and `configlines` are Jinja lines loading service
    configurations, for the manifests to use.
    """
    out = START_BLOCK.format(csc_defaults=csc_defaults, configlines=configlines)
    return out.lstrip() + "\n" + manifests + END_BLOCK


def write_output(out, output):
    if output:
        with open(output, "w", encoding="utf-8") as fd:
            fd.write(out)
    else:
        sys.stdout.write(out)
