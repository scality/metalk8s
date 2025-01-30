#!/usr/bin/env python

"""
This script downloads operator controller and catalogd manifests and `renders` them into a useable
salt chart.

To do so, it:
  - downloads manifests from github releases (optional)
  - merges duplicate objects
  - adds appropriate labels
  - changes names and namespaces of cert-manager resources
  - swaps image values
"""

import argparse
import io
import pathlib
import re
import requests
import sys
import yaml

CONTROLLER_MANIFEST_URL = "https://github.com/operator-framework/operator-controller/releases/download/{version}/operator-controller.yaml"

CATALOGD_MANIFEST_URL = "https://github.com/operator-framework/catalogd/releases/download/{version}/catalogd.yaml"

REGISTRIES_CONF = """
[[registry]]
prefix = "{% endraw -%}{{ repo.registry_endpoint }}{%- raw %}"
insecure = true
location = "{% endraw -%}{{ repo.registry_endpoint }}{%- raw %}:80"
[[registry]]
prefix = "registry.metalk8s.lan"
insecure = true
location = "{% endraw -%}{{ repo.registry_endpoint }}{%- raw %}:80"
"""


START_BLOCK = """
#!jinja | metalk8s_kubernetes

{%- from "metalk8s/map.jinja" import repo with context %}
{%- from "metalk8s/repo/macro.sls" import build_image_name with context %}

{% raw %}
"""

END_BLOCK = """
{% endraw %}
"""


class DownloadError(Exception):
    pass


def semver_regex_type(value):
    pat = re.compile(r"^v\d+\.\d+\.\d+$")
    if not pat.match(value):
        raise argparse.ArgumentTypeError("invalid value, must be ~v1.1.2")
    return value


def download_source_manifest(version):
    controller_response = requests.get(CONTROLLER_MANIFEST_URL.format(version=version))
    catalogd_response = requests.get(CATALOGD_MANIFEST_URL.format(version=version))
    if controller_response.status_code == 200 and catalogd_response.status_code == 200:
        return controller_response.content, catalogd_response.content
    raise DownloadError("Problem fetching catalogd or operator controller manifests")


"""
Merge source manifests on top of destination
"""


def merge(source, destination):
    def _dict_merge(src, dst):
        for k, v in src.items():
            if k in dst and isinstance(dst[k], dict) and isinstance(v, dict):
                _dict_merge(v, dst[k])
            else:
                dst[k] = v

    to_add = []
    # check for each doc in source
    for sdoc in source:
        # does it exist in the destination docs ?
        found = False
        for ddoc in destination:
            if (
                ddoc["kind"] == sdoc["kind"]
                and ddoc["metadata"]["name"] == sdoc["metadata"]["name"]
            ):
                found = True
                _dict_merge(sdoc, ddoc)
        if not found:
            to_add.append(sdoc)
    destination.extend(to_add)
    return destination


def add_labels(manifest, version):
    for doc in manifest:
        doc["metadata"].setdefault("labels", {}).update(
            {
                "app.kubernetes.io/instance": "olm",
                "app.kubernetes.io/managed-by": "salt",
                "app.kubernetes.io/part-of": "metalk8s",
                "app.kubernetes.io/version": str(version),
                "heritage": "metalk8s",
            }
        )
    return manifest


def add_tolerations(manifest):
    for doc in manifest:
        if doc["kind"] == "Deployment":
            doc["spec"]["template"]["spec"].setdefault("tolerations", []).extend(
                [
                    {
                        "key": "node-role.kubernetes.io/bootstrap",
                        "operator": "Exists",
                        "effect": "NoSchedule",
                    },
                    {
                        "key": "node-role.kubernetes.io/infra",
                        "operator": "Exists",
                        "effect": "NoSchedule",
                    },
                ]
            )
    return manifest


def add_registries_conf(manifest):
    manifest.append(
        {
            "apiVersion": "v1",
            "kind": "ConfigMap",
            "metadata": {
                "name": "registries-conf",
                "namespace": "olmv1-system",
            },
            "data": {
                "registries.conf": REGISTRIES_CONF,
            },
        }
    )
    for doc in manifest:
        if doc["kind"] == "Deployment":
            doc["spec"]["template"]["spec"]["volumes"].append(
                {
                    "name": "registries-conf",
                    "configMap": {
                        "name": "registries-conf",
                    },
                }
            )
            doc["spec"]["template"]["spec"]["containers"][0]["volumeMounts"].append(
                {
                    "name": "registries-conf",
                    "mountPath": "/etc/containers/",
                }
            )
    return manifest


def add_node_selector(manifest):
    for doc in manifest:
        if doc["kind"] == "Deployment":
            doc["spec"]["template"]["spec"].setdefault("nodeSelector", {}).update(
                {
                    "kubernetes.io/os": "linux",
                    "node-role.kubernetes.io/infra": "",
                }
            )
    return manifest


def fixup_certmanager(manifest):
    for doc in manifest:
        if (
            doc["apiVersion"] == "cert-manager.io/v1"
            and doc["metadata"].get("namespace") == "cert-manager"
        ):
            doc["metadata"]["namespace"] = "metalk8s-certs"
        if doc["kind"] == "MutatingWebhookConfiguration":
            doc["metadata"]["annotations"][
                "cert-manager.io/inject-ca-from-secret"
            ] = "metalk8s-certs/olmv1-ca"
    return manifest


class multiline_string(str):
    pass


def represent_multiline_string(dumper, data):
    scalar = yaml.SafeDumper.represent_str(dumper, data)
    scalar.style = "|"
    return scalar


yaml.SafeDumper.add_representer(multiline_string, represent_multiline_string)


def render(manifest):
    def _fix_strings(obj):
        if isinstance(obj, dict):
            return dict((k, _fix_strings(v)) for (k, v) in obj.items())
        elif isinstance(obj, list):
            return [_fix_strings(elem) for elem in obj]
        elif isinstance(obj, str):
            if "\n" in obj:
                value = "\n".join(
                    line for line in obj.splitlines() if not re.match(r"^\s*$", line)
                )
                return multiline_string(value)
            return obj
        else:
            return obj

    manifest = _fix_strings(manifest)
    out = START_BLOCK.lstrip()
    stream = io.StringIO()
    yaml.safe_dump_all(
        manifest,
        stream,
        default_flow_style=False,
    )
    stream.seek(0)
    out += re.sub(
        r"image: quay.io/operator-framework/(?P<image>.*):(?P<tag>.*)",
        r'image: {% endraw -%}{{ build_image_name("\g<image>", False) }}{%- raw %}:\g<tag>',
        stream.read(),
    )
    out += END_BLOCK
    return out


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("-v", "--version", type=semver_regex_type)
    parser.add_argument("-o", "--output", type=pathlib.Path)
    args = parser.parse_args()

    # 1 - download the manifests
    controller_manifest, catalogd_manifest = download_source_manifest(
        version=args.version
    )

    # 1.5 - interpret yaml
    controller = list(yaml.safe_load_all(controller_manifest))
    catalogd = list(yaml.safe_load_all(catalogd_manifest))

    # 2 - merge manifests
    manifest = merge(catalogd, controller)

    # 3- add labels, tolerations, nodeSelector
    manifest = add_labels(manifest, args.version)
    manifest = add_tolerations(manifest)
    manifest = add_node_selector(manifest)
    manifest = add_registries_conf(manifest)

    # 4- Fix cert-manager objects
    manifest = fixup_certmanager(manifest)

    # 5- render yaml with new images
    rendered = render(manifest)

    if args.output:
        with open(args.output, "w") as fd:
            fd.write(rendered)
    else:
        sys.stdout.write(rendered)


if __name__ == "__main__":
    main()
