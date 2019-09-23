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

┌───────────────┐    ┌───────┐    ┌────────┐
│ documentation │───>│ mkdir │───>│ deploy │
└───────────────┘    └───────┘    └────────┘
"""



from collections import namedtuple
from typing import Callable, Iterator
from pathlib import Path

from buildchain import config
from buildchain import coreutils
from buildchain import constants
from buildchain import targets
from buildchain import types
from buildchain import utils


DocTarget = namedtuple('DocTarget', ('name', 'command', 'target'))
DOC_BUILD_DIR : Path = constants.ROOT/'docs/_build'
DOC_PDF_FILE  : Path = DOC_BUILD_DIR/'latex/{}.pdf'.format(config.PROJECT_NAME)


def task_documentation() -> types.TaskDict:
    """Generate documentations for the ISO."""
    return {
        'actions': None,
        'task_dep': [
            '_doc_mkdir_root',
            '_doc_deploy'
        ],
    }


def task__doc_mkdir_root() -> types.TaskDict:
    """Create the documentation root directory."""
    return targets.Mkdir(
        directory=constants.ISO_DOCS_ROOT, task_dep=['_iso_mkdir_root']
    ).task


def task__doc_deploy() -> types.TaskDict:
    """Deploy the documentation on the ISO."""
    source = DOC_PDF_FILE
    target = constants.ISO_DOCS_ROOT/'user-guide.pdf'
    return {
        'title': utils.title_with_target1('COPY'),
        'actions': [(coreutils.cp_file, (source, target))],
        'targets': [target],
        'task_dep': ['_doc_mkdir_root'],
        'file_dep': [source],
        'clean': True,
    }


def task_doc() -> Iterator[types.TaskDict]:
    """Generate the documentation."""
    def clean(target: DocTarget) -> Callable[[], None]:
        """Delete the build sub-directory for the given target."""
        return lambda: coreutils.rm_rf(target.target.parent)

    doc_targets = (
        DocTarget(name='html', command='html',
                  target=DOC_BUILD_DIR/'html/index.html'),
        DocTarget(name='pdf', command='latexpdf', target=DOC_PDF_FILE)
    )
    for target in doc_targets:
        doc_format = target.name.upper()
        action = ['tox', '-e', 'docs', '--', target.command]
        # In CI we reuse already built PDF: just check the existence.
        if config.RUNNING_IN_CI:
            action = ['test', '-f', target.target]
        yield {
            'name': target.name,
            'title': utils.title_with_target1('DOC {}'.format(doc_format)),
            'doc': 'Generate {} {} documentation'.format(
                config.PROJECT_NAME, doc_format
            ),
            'actions': [action],
            'targets': [target.target],
            'file_dep': list(utils.git_ls('docs')),
            'clean': [clean(target)],
        }


__all__ = utils.export_only_tasks(__name__)
