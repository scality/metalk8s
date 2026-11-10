"""
Render a Helm chart or a kustomize directory into a SLS file that deploys it
in a Kubernetes cluster as part of MetalK8s.

Usage (with the buildchain Python, which provides PyYAML):

    python3 buildchain/render helm charts/<name> [options]
    python3 buildchain/render kustomize kustomizes/<name> [options]

Run `python3 buildchain/render {helm,kustomize} --help` for the options.
"""

import argparse

import common
import helm
import kustomize

RENDERERS = {"helm": helm, "kustomize": kustomize}


def main():
    parser = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    subparsers = parser.add_subparsers(dest="source", required=True)
    for source, renderer in RENDERERS.items():
        subparser = subparsers.add_parser(
            source,
            help=renderer.__doc__.strip().splitlines()[0],
            description=renderer.__doc__,
            formatter_class=argparse.RawDescriptionHelpFormatter,
        )
        renderer.add_arguments(subparser)
        common.add_arguments(subparser)
    args = parser.parse_args()

    try:
        out = RENDERERS[args.source].render(args)
    except ValueError as exc:
        parser.error(str(exc))

    common.write_output(out, args.output)


if __name__ == "__main__":
    main()
