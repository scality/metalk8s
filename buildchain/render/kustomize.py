"""
Render a kustomize directory into a SLS file.

This takes a kustomize directory and turns its output into a SLS file that
deploys it in a Kubernetes cluster as part of MetalK8s.

It performs the following tasks:

- Run `kustomize build` on the directory
- Replace strings in its output, in the given order (kustomize does not set the
  namespace in custom resource fields, like the Certificate `dnsNames`)
- Keep or remove manifests, selected by kind and name
- Put the manifests in the `kustomizes/template.sls.in` SLS template

The manifests are written as `kustomize build` outputs them: they are only
parsed to read their kind and name.
"""

import string
import subprocess

import yaml

import common

TEMPLATE_FILE = common.REPO_ROOT / "kustomizes" / "template.sls.in"
DOCUMENT_SEPARATOR = "\n---\n"


class SlsTemplate(string.Template):
    """Template using `@@` as delimiter, like the buildchain templates."""

    delimiter = "@@"


def manifest_id(document):
    """Return the kind and name of a manifest written as text."""
    return common.manifest_id(yaml.safe_load(document) or {})


def add_arguments(parser):
    parser.add_argument("path", help="Path to the kustomize directory")
    parser.add_argument(
        "--replace",
        action="append",
        nargs=2,
        dest="replacements",
        metavar=("OLD", "NEW"),
        help="Replace OLD by NEW in the kustomize output, can be repeated "
        "(replacements are done in the given order)",
    )


def render(args):
    rendered = subprocess.check_output(["kustomize", "build", args.path], text=True)
    rendered = rendered.strip()
    for old, new in args.replacements or []:
        rendered = rendered.replace(old, new)
    documents = rendered.split(DOCUMENT_SEPARATOR)

    selected = common.select_manifests(
        documents, args.keep_manifests, args.remove_manifests, identify=manifest_id
    )

    return SlsTemplate(TEMPLATE_FILE.read_text(encoding="utf-8")).substitute(
        Manifests=DOCUMENT_SEPARATOR.join(selected)
    )
