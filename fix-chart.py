import sys

import yaml


def maybe_copy(doc, src, dest):
    obj = object()
    value = doc.get(src, obj)
    if value is not obj:
        doc[dest] = value


def fixup_dict(doc):
    if doc.get('heritage') == 'Tiller':
        maybe_copy(doc, 'app', 'app.kubernetes.io/name')
        maybe_copy(doc, 'component', 'app.kubernetes.io/component')

        doc['heritage'] = 'metalk8s'
        doc['app.kubernetes.io/part-of'] = 'metalk8s'
        doc['app.kubernetes.io/managed-by'] = 'metalk8s'

    return dict((key, fixup_doc(value)) for (key, value) in doc.items())


def fixup_doc(doc):
    if isinstance(doc, dict):
        return fixup_dict(doc)
    elif isinstance(doc, list):
        return map(fixup_doc, doc)
    else:
        return doc


def fixup_metadata(doc):
    if 'metadata' in doc and 'namespace' not in doc['metadata']:
        doc['metadata']['namespace'] = 'metallb-system'

    return doc


def main(fd_in, fd_out):
    yaml.safe_dump_all(
        (fixup_metadata(fixup_doc(doc)) for doc in yaml.safe_load_all(fd_in) if doc),
        fd_out,
    )


if __name__ == '__main__':
    main(sys.stdin, sys.stdout)
