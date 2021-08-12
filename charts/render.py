#!/usr/bin/env python3

"""
This script takes a Helm release name, a namespace name, a Helm chart
`values` file and a chart, and turns it into a YAML document that can be
deployed in a Kubernetes cluster as part of MetalK8s.

It performs the following tasks:

- Run `helm template` to render the chart, passing in the values provided on the
  command-line
- Fix up the resulting objects to include the desired namespace (which is not
  always part of chart templates) in the metadata section
- Fix up the resulting objects labels and annotations replace their `Tiller`
  heritage by `metalk8s`, set the `app.kubernetes.io/part-of` and
  `app.kubernetes.io/managed-by` to `salt`, and copy any `app` and
  `component` fields to the canonical `app.kubernetes.io/name` and
  `app.kubernetes.io/component` fields
- Replace YAML-safe special strings (used in Helm values definitions) with the
  appropriate Jinja syntax. Supports:
    - "__var__(<varname>)", to replace with "{{ <varname> }}" (useful when
      retrieving variables from service configuration ConfigMaps)
    - "__image__(<imgname>)", to replace with
      "{{ build_image_name("<imgname>", False) }}"
    - "__full_image__(<imgname>)", to replace with
      "{{ build_image_name("<imgname>") }}"
"""

import argparse
import copy
import io
import json
import pathlib
import re
import sys
import subprocess

import yaml
from yaml.dumper import SafeDumper
from yaml.representer import SafeRepresenter


START_BLOCK = """
#!jinja | metalk8s_kubernetes

{{%- from "metalk8s/repo/macro.sls" import build_image_name with context %}}
{csc_defaults}
{configlines}

{{% raw %}}
"""

END_BLOCK = """
{% endraw %}
"""


def fixup_metadata(namespace, doc):
    if "metadata" in doc and "namespace" not in doc["metadata"]:
        doc["metadata"]["namespace"] = namespace

    if doc.get("kind", None) == "ConfigMapList":
        doc["items"] = [
            fixup_metadata(namespace, configmap) for configmap in doc["items"]
        ]

    return doc


def maybe_copy(doc, src, dest):
    try:
        doc[dest] = doc[src]
    except KeyError:
        pass


def fixup_dict(doc):
    if (
        doc.get("heritage") == "Helm"
        or doc.get("app.kubernetes.io/managed-by") == "Helm"
    ):
        maybe_copy(doc, "app", "app.kubernetes.io/name")
        maybe_copy(doc, "component", "app.kubernetes.io/component")

        doc["heritage"] = "metalk8s"
        doc["app.kubernetes.io/part-of"] = "metalk8s"
        doc["app.kubernetes.io/managed-by"] = "salt"

    return dict((key, fixup_doc(value)) for (key, value) in doc.items())


# Represent multiline strings as literal blocks {{{
class multiline_str(str):
    pass


def representer_multiline_str(dumper, data):
    scalar = SafeRepresenter.represent_str(dumper, data)
    scalar.style = "|"
    return scalar


SafeDumper.add_representer(multiline_str, representer_multiline_str)


def fixup_string(value):
    if "\n" in value:
        # Remove empty lines
        value = "\n".join(
            line for line in value.splitlines() if not re.match("^\s*$", line)
        )
        return multiline_str(value)
    return value


# }}}


def fixup_doc(doc):
    if isinstance(doc, dict):
        return fixup_dict(doc)
    elif isinstance(doc, list):
        return [fixup_doc(d) for d in doc]
    elif isinstance(doc, str):
        return fixup_string(doc)
    else:
        return doc


def remove_doc(doc, remove_manifests):
    for to_remove in remove_manifests or []:
        if (
            doc.get("kind") == to_remove[0]
            and doc.get("metadata").get("name") == to_remove[1]
        ):
            return True

    return False


def keep_doc(doc):
    if not doc:
        return False

    if ((doc.get("metadata") or {}).get("annotations") or {}).get(
        "helm.sh/hook"
    ) == "test-success":
        return False

    return True


def replace_magic_strings(rendered_yaml):
    # Handle __var__
    result = re.sub(
        r"__var__\((?P<varname>[\w\-_]+(?:\.[\w\-_()]+)*)\)",
        r"{% endraw -%}{{ \g<varname> }}{%- raw %}",
        rendered_yaml,
    )

    # Handle __var_tojson__
    result = re.sub(
        r"__var_tojson__\((?P<varname>[\w\-_]+(?:\.[\w\-_()|]+)*)\)",
        r"  {% endraw -%}{{ \g<varname> | tojson }}{%- raw %}",
        result,
    )

    # Handle __escape__
    result = re.sub(
        r"__escape__\((?P<varname>.*)\)",
        r'"{% endraw -%}\g<varname>{%- raw %}"',
        result,
    )

    # Handle __image__
    result = re.sub(
        r"__image__\((?P<imgname>[\w\-]+)\)",
        r'{% endraw -%}{{ build_image_name("\g<imgname>", False) }}{%- raw %}',
        result,
    )

    # Handle __full_image__ (include version tag in the rendered name)
    result = re.sub(
        r"__full_image__\((?P<imgname>[\w\-]+)\)",
        r'{% endraw -%}{{ build_image_name("\g<imgname>") }}{%- raw %}',
        result,
    )

    return result


def remove_prometheus_rules(template, drop_rules):
    updated_template = None
    groups = []

    existing_groups = template.get("spec", {}).get("groups", [])
    for group in existing_groups:
        group_rules = group.get("rules", [])
        new_rules = group_rules[:]
        to_drop = drop_rules.get(group.get("name"), [])
        if to_drop:
            for rule in group_rules:
                if any(rule.get(key) in to_drop for key in ["alert", "record"]):
                    new_rules.remove(rule)
        if new_rules:
            groups.append(dict(group, rules=new_rules))

    if groups:
        updated_template = copy.deepcopy(template)
        updated_template["spec"]["groups"] = groups

    return updated_template


DASHBOARD_PATCHES_FILE = (
    pathlib.Path(__file__).parent / "grafana_dashboard_patches.json"
)
DASHBOARD_PATCHES = json.loads(DASHBOARD_PATCHES_FILE.read_text())


def set_value_at(obj, path, value):
    key, _, rem_path = path.partition(".")
    if isinstance(obj, dict):
        if rem_path:
            set_value_at(obj[key], rem_path, value)
        else:
            obj[key] = value
    elif isinstance(obj, list):
        index = int(key)
        if rem_path:
            assert index < len(obj)
            set_value_at(obj[index], rem_path, value)
        else:
            assert index <= len(obj)
            if index == len(obj):
                obj.append(value)
            else:
                obj[index] = value
    else:
        raise ValueError(f'Cannot assign to "{type(obj)!r}" object.')


def patch_grafana_dashboards(manifest):
    for fname in manifest["data"]:
        dashboard = json.loads(manifest["data"][fname])
        title = dashboard.get("title")
        assert title, f"Invalid Grafana dashboard: title={title!r}"
        patch = DASHBOARD_PATCHES.get(title)
        if patch is not None:
            for path, value in patch.items():
                set_value_at(dashboard, path, value)
            manifest["data"][fname] = json.dumps(dashboard, indent=4, sort_keys=True)

    return manifest


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("name", help="Denotes the name of the chart")
    parser.add_argument(
        "-n", "--namespace", default="default", help="Namespace to deploy this chart in"
    )
    parser.add_argument("values", help="Our custom chart values")

    class ActionServiceConfigArgs(argparse.Action):
        def __call__(self, parser, args, values, option_string=None):
            if len(values) > 4:
                raise argparse.ArgumentTypeError(
                    'Argument "{0}" requires between 1 and 4 arguments'.format(
                        option_string
                    )
                )

            name = values.pop(0)
            try:
                configmap = values.pop(0)
            except IndexError:
                configmap = "metalk8s-{0}-config".format(name)
            try:
                path = values.pop(0)
            except IndexError:
                path = "metalk8s/addons/{0}/config/{1}.yaml".format(args.name, name)
            service_namespace = values.pop(0)

            option = getattr(args, self.dest)
            if option is None:
                setattr(args, self.dest, [[name, configmap, path, service_namespace]])
            else:
                option.append([name, configmap, path, service_namespace])

    """
    To use this argument, follow the format below:
        --service-config service_name service_configmap_name service_namespace
    where service_name is actually the jinja variable which will hold
    ConfigMap contents.
    Note that you can specify multiple service config arguments using:
        --service-config grafana metalk8s-grafana-config metalk8s-monitoring
        --service-config dex metalk8s-dex-config metalk8s-auth
    """
    # Todo: Add kind & apiVersion to the service-config nargs
    parser.add_argument(
        "--service-config",
        action=ActionServiceConfigArgs,
        nargs="+",
        required=False,
        dest="service_configs",
        help="Example: --service-config grafana metalk8s-grafana-config "
        "metalk8s/addons/prometheus-operator/config/grafana.yaml "
        "metalk8s-monitoring",
    )
    parser.add_argument(
        "--drop-prometheus-rules",
        help="YAML formatted file to drop some pre-defined Prometheus rules",
    )
    parser.add_argument(
        "--remove-manifest",
        action="append",
        nargs=2,
        dest="remove_manifests",
        metavar=("KIND", "NAME"),
        help="Remove a given manifest from the resulting chart",
    )
    parser.add_argument(
        "--kube-version",
        help="Override default kube-version used by helm",
    )

    parser.add_argument("path", help="Path to the chart directory")
    args = parser.parse_args()

    command = [
        "helm",
        "template",
        args.name,
        "--namespace",
        args.namespace,
        "--values",
        args.values,
        "--include-crds",
        args.path,
    ]

    if args.kube_version:
        command.extend(["--kube-version", args.kube_version])

    template = subprocess.check_output(command)

    drop_prometheus_rules = {}
    if args.drop_prometheus_rules:
        with open(args.drop_prometheus_rules, "r") as fd:
            drop_prometheus_rules = yaml.safe_load(fd)

    def fixup(doc):
        if isinstance(doc, dict):
            kind = doc.get("kind")
            if drop_prometheus_rules and kind == "PrometheusRule":
                doc = remove_prometheus_rules(doc, drop_prometheus_rules)
            if (
                kind == "ConfigMap"
                and doc.get("metadata", {}).get("labels", {}).get("grafana_dashboard")
                == "1"
            ):
                doc = patch_grafana_dashboards(doc)

        return (
            fixup_metadata(namespace=args.namespace, doc=fixup_doc(doc=doc))
            if doc
            else None
        )

    import_csc_yaml = []
    config = []
    for name, configmap, path, service_namespace in args.service_configs or []:
        import_csc_yaml.append(
            "{{% set {0}_defaults = "
            "salt.slsutil.renderer('salt://{1}', saltenv=saltenv) %}}".format(
                name,
                path,
            )
        )
        config.append(
            "{{%- set {0} = salt.metalk8s_service_configuration"
            ".get_service_conf('{1}', '{2}', {0}_defaults) %}}".format(
                name, service_namespace, configmap
            )
        )

    sys.stdout.write(
        START_BLOCK.format(
            csc_defaults="\n".join(import_csc_yaml), configlines="\n".join(config)
        ).lstrip()
    )
    sys.stdout.write("\n")

    manifests = []
    for doc in yaml.safe_load_all(template):
        if keep_doc(doc):
            doc = fixup(doc)
        if doc and not remove_doc(doc, args.remove_manifests):
            manifests.append(doc)

    stream = io.StringIO()
    yaml.safe_dump_all(
        manifests,
        stream,
        default_flow_style=False,
    )
    stream.seek(0)

    sys.stdout.write(replace_magic_strings(stream.read()))

    sys.stdout.write(END_BLOCK)


if __name__ == "__main__":
    main()
