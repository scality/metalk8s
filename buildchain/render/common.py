"""Options and helpers shared by the Helm and kustomize renderers."""

import pathlib
import sys

# Root of the MetalK8s repository.
REPO_ROOT = pathlib.Path(__file__).resolve().parents[2]


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


def write_output(out, output):
    if output:
        with open(output, "w", encoding="utf-8") as fd:
            fd.write(out)
    else:
        sys.stdout.write(out)
