# coding: utf-8

"""Tasks to build the MetalK8s documentation and add it to the ISO.

This module provides task to:
- build the doc as HTML
- build the doc as PDF
- add the generated PDF into the ISO

Overview;

               ┌──────────┐
           ───>│ doc:html │
┌───────┐╱     └──────────┘
│  doc  │
└───────┘╲     ┌──────────┐
           ───>│ doc:pdf  │
               └──────────┘
"""



from collections import namedtuple
from typing import Callable, Iterator

from buildchain import config
from buildchain import coreutils
from buildchain import constants
from buildchain import types
from buildchain import utils


DocTarget = namedtuple('DocTarget', ('name', 'command', 'target'))


def task_doc() -> Iterator[types.TaskDict]:
    """Generate the documentation."""
    def clean(target: DocTarget) -> Callable[[], None]:
        """Delete the build sub-directory for the given target."""
        return lambda: coreutils.rm_rf(target.target.parent)

    project = config.PROJECT_NAME
    doc_buildroot = constants.ROOT/'docs/_build'
    doc_targets = (
        DocTarget(name='html', command='html',
                  target=doc_buildroot/'html/index.html'),
        DocTarget(name='pdf', command='latexpdf',
                  target=doc_buildroot/'latex/{}.pdf'.format(project)),
    )
    for target in doc_targets:
        doc_format = target.name.upper()
        yield {
            'name': target.name,
            'doc': 'Generate {} {} documentation'.format(project, doc_format),
            'actions': [['tox', '-e', 'docs', '--', target.command]],
            'targets': [target.target],
            'file_dep': list(utils.git_ls('docs')),
            'clean': [clean(target)],
        }


__all__ = utils.export_only_tasks(__name__)
