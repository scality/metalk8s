"""
Render a kustomize directory into a SLS file.

This takes a kustomize directory and turns its output into a SLS file that
deploys it in a Kubernetes cluster as part of MetalK8s.

It performs the following tasks:

- Run `kustomize build` on the directory
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
    manifest = yaml.safe_load(document) or {}
    return (manifest.get("kind"), (manifest.get("metadata") or {}).get("name"))


def select_documents(documents, keep_manifests, remove_manifests):
    # A typo in a name would silently keep or drop the wrong manifests
    wanted = (keep_manifests or []) + (remove_manifests or [])
    missing = {tuple(manifest) for manifest in wanted}
    selected = []
    for document in documents:
        kind, name = manifest_id(document)
        missing.discard((kind, name))
        if common.is_selected(kind, name, keep_manifests, remove_manifests):
            selected.append(document)

    if missing:
        raise ValueError(
            "Manifests not found in the kustomize output: "
            + ", ".join(f"{kind}/{name}" for kind, name in sorted(missing))
        )

    return selected


def add_arguments(parser):
    parser.add_argument("path", help="Path to the kustomize directory")


def render(args):
    rendered = subprocess.check_output(["kustomize", "build", args.path], text=True)
    documents = rendered.strip().split(DOCUMENT_SEPARATOR)

    selected = select_documents(documents, args.keep_manifests, args.remove_manifests)

    return SlsTemplate(TEMPLATE_FILE.read_text(encoding="utf-8")).substitute(
        Manifests=DOCUMENT_SEPARATOR.join(selected) + "\n"
    )
