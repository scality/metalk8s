#!/usr/bin/env python

"""Utility script to generate a Solution manifest from given arguments."""

import argparse
import sys
import yaml


def parse_arguments():
    """Parse arguments from the CLI."""
    parser = argparse.ArgumentParser()

    parser.add_argument(
        '-a',
        '--annotation',
        nargs=2,
        action='append',
        dest='annotations',
        default=[],
        metavar=('KEY', 'VALUE'),
        help="add an annotation to the Solution manifest metadata",
    )

    parser.add_argument(
        '-e',
        '--extra-image',
        nargs=2,
        action='append',
        dest='extra_images',
        default=[],
        metavar=('NAME', 'TAG'),
        help="add an image to the list of images shipped by the Solution",
    )

    parser.add_argument(
        '-l',
        '--label',
        nargs=2,
        action='append',
        dest='labels',
        default=[],
        metavar=('KEY', 'VALUE'),
        help="add a label to the Solution manifest metadata",
    )

    parser.add_argument(
        '-n',
        '--name',
        required=True,
        metavar='SOLUTION_NAME',
        help="set the name of the Solution",
    )

    parser.add_argument(
        '-o',
        '--operator-image',
        required=True,
        nargs=2,
        metavar=('NAME', 'TAG'),
        help="set the Operator image name and tag in the manifest spec",
    )

    parser.add_argument(
        '-v',
        '--version',
        required=True,
        help="version of the Solution",
    )

    return parser.parse_args()


def build_manifest(args):
    """Build manifest from arguments provided on the CLI."""
    return {
        'apiVersion': 'solutions.metalk8s.scality.com/v1alpha1',
        'kind': 'Solution',
        'metadata': {
            'name': args.name,
            'annotations': dict(args.annotations),
            'labels': dict(args.labels),
        },
        'spec': {
            'images': list(set(
                ':'.join(image) for image in (
                    args.extra_images + [args.operator_image]
                )
            )),
            'operator': {
                'image': dict(zip(('name', 'tag'), args.operator_image)),
            },
            'version': args.version,
        },
    }


def main(stream=sys.stdout):
    """Script entrypoint."""
    args = parse_arguments()
    manifest = build_manifest(args)
    yaml.safe_dump(manifest, stream, default_flow_style=False)


if __name__ == '__main__':
    main()
