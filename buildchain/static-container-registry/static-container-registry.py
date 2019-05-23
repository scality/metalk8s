#!/usr/bin/env python

import sys
import os.path
import json
import hashlib
import logging
import argparse


LOGGER = logging.getLogger(__name__)


CONSTANTS = '''
location = /v2 {{
    return 301 /v2/;
}}

location = /v2/ {{
    return 200 'ok';
}}

location @404_tag {{
    internal;
    types {{ }} default_type "application/json";
    return 404 '{tag_invalid:s}';
}}
'''.format(
        tag_invalid=json.dumps({
            'errors': [{
                'code': 'TAG_INVALID',
                'message': 'manifest tag did not match URI',
                'detail': '',
            }]
        }),
    )


MANIFEST_JSON = 'manifest.json'


def find_images(root):
    LOGGER.info('Finding images in %s', root)

    for name in os.listdir(root):
        curr = os.path.join(root, name)
        LOGGER.info('Looking into %s for tags of %s', curr, name)

        if not os.path.isdir(curr):
            continue

        for tag in os.listdir(curr):
            curr = os.path.join(root, name, tag)

            if not os.path.isdir(curr):
                LOGGER.info('Not a directory: %s', curr)
                continue

            LOGGER.info('Looking into %s for a valid image', curr)

            manifest = os.path.join(curr, MANIFEST_JSON)

            if not os.path.isfile(manifest):
                LOGGER.info('No manifest file at %s', manifest)
                continue

            with open(manifest, 'r') as fd:
                LOGGER.info('Attempting to load JSON data from %s', manifest)
                try:
                    data = json.load(fd)
                except json.JSONDecodeError:
                    LOGGER.info('Failed to decode JSON from %s', manifest)
                    data = None

            if not data:
                continue

            if data.get('schemaVersion') != 2:
                LOGGER.info('Invalid schemaVersion in %s', manifest)
                continue

            if data.get('mediaType') != \
                    'application/vnd.docker.distribution.manifest.v2+json':
                LOGGER.info('Invalid mediaType in %s', manifest)
                continue

            LOGGER.info('Found image %s:%s in %s', name, tag, curr)
            yield (name, tag)


def create_config(root, server_root, name_prefix):
    yield CONSTANTS

    images = {}
    for (name, tag) in find_images(root):
        images.setdefault(name, set()).add(tag)

    for (name, tags) in sorted(images.items()):
        tag_list = {
            'name': name,
            'tags': sorted(tags),
        }

        yield '''
location = /v2/{name_prefix:s}{name:s}/tags/list {{
    types {{ }} default_type "application/json";
    return 200 '{payload:s}';
}}
'''.format(
        name=name,
        name_prefix=name_prefix.lstrip('/'),
        payload=json.dumps(tag_list),
    )

        seen_digests = set()

        for tag in sorted(tags):
            manifest_file = os.path.join(root, name, tag, MANIFEST_JSON)

            digest = hashlib.sha256()

            with open(manifest_file, 'rb') as fd:
                for chunk in iter(lambda: fd.read(4096), b''):
                    digest.update(chunk)

            hexdigest = digest.hexdigest()

            yield '''
location = "/v2/{name_prefix:s}{name:s}/manifests/{tag:s}" {{
    alias {server_root:s}/{name:s}/{tag:s}/;
    types {{ }} default_type "application/vnd.docker.distribution.manifest.v2+json";
    add_header 'Docker-Content-Digest' 'sha256:{digest:s}';
    try_files manifest.json =404;
    error_page 404 @404_tag;
}}
'''.format(
        name=name,
        tag=tag,
        name_prefix=name_prefix.lstrip('/'),
        digest=hexdigest,
        server_root=server_root,
    )

            if hexdigest not in seen_digests:
                yield '''
location = "/v2/{name_prefix:s}{name:s}/manifests/sha256:{digest:s}" {{
    alias {server_root:s}/{name:s}/{tag:s}/;
    types {{ }} default_type "application/vnd.docker.distribution.manifest.v2+json";
    add_header 'Docker-Content-Digest' 'sha256:{digest:s}';
    try_files manifest.json =404;
    error_page 404 @404_tag;
}}
'''.format(
        name=name,
        tag=tag,
        name_prefix=name_prefix.lstrip('/'),
        digest=hexdigest,
        server_root=server_root,
    )
            else:
                yield '''
# Digest for "{name:s}:{tag:s}" already served
'''.format(
        name=name,
        tag=tag,
    )

            seen_digests.add(hexdigest)

        yield '''
location ~ "/v2/{name_prefix:s}{name:s}/blobs/sha256:([a-f0-9]{{64}})" {{
    alias {server_root:s}/{name:s}/;
    try_files {paths:s} =404;
}}
'''.format(
        name_prefix=name_prefix.lstrip('/'),
        server_root=server_root,
        name=name,
        paths=' '.join('{tag:s}/$1'.format(tag=tag) for tag in sorted(tags)),
    )


def main():
    logging.basicConfig(
        level=logging.INFO,
    )

    parser = argparse.ArgumentParser()
    parser.add_argument(
        '--name-prefix',
        metavar='PREFIX',
        help='optional prefix added to every image name',
    )

    root = os.getcwd()
    parser.add_argument(
        '--server-root',
        metavar='PATH',
        help='root directory from where exported image files are served' \
                ' (default: ROOT)'
    )
    parser.add_argument(
        'root',
        metavar='ROOT',
        nargs='?',
        default=root,
        help='root directory containing exported images (default: {})'.format(
                root),
    )

    args = parser.parse_args()

    name_prefix = '{}/'.format((args.name_prefix or '').strip('/'))
    root = os.path.abspath(args.root)
    server_root = args.server_root or root

    logging.debug('Name prefix: %s', name_prefix)
    logging.debug('Server root: %s', server_root)
    logging.debug('Root: %s', root)

    for part in create_config(root, server_root, name_prefix):
        sys.stdout.write(part)


if __name__ == '__main__':
    main()
