# Configuration file for the Sphinx documentation builder.
#
# This file only contains a selection of the most common options. For a full
# list see the documentation:
# http://www.sphinx-doc.org/en/master/config

import os
import pathlib
import sys

# -- Path setup --------------------------------------------------------------

# If extensions (or modules to document with autodoc) are in another directory,
# add these directories to sys.path here. If the directory is relative to the
# documentation root, use os.path.abspath to make it absolute, like shown here.

_lib_path = pathlib.Path(__file__).parent / '_lib'
sys.path.insert(0, str(_lib_path.resolve()))

# -- Environment toggles -----------------------------------------------------

ON_RTD = os.environ.get('READTHEDOCS') == 'True'

# -- Project information -----------------------------------------------------

project = 'MetalK8s'
copyright = '2020, Scality'
author = 'Scality'

# The short version, {major}.{minor}
version = '2.4'

# The full version, including alpha/beta/rc tags
release = '2.4.3-dev'


# -- General configuration ---------------------------------------------------

# Add any Sphinx extension module names here, as strings. They can be
# extensions coming with Sphinx (named 'sphinx.ext.*') or your custom
# ones.
extensions = [
    'sphinx.ext.todo',
    'sphinx.ext.ifconfig',
    'sphinx.ext.githubpages',
    'sphinx.ext.intersphinx',
    'sphinxcontrib.spelling',
    'sphinxcontrib.plantuml',
    'sphinxcontrib_github_alt',
]

if ON_RTD:
    extensions.extend([
        'metalk8s_sphinxext_googleanalytics',
    ])

# Add any paths that contain templates here, relative to this directory.
templates_path = ['_templates']

# The master toctree document.
master_doc = 'index'

# List of patterns, relative to source directory, that match files and
# directories to ignore when looking for source files.
# This pattern also affects html_static_path and html_extra_path.
exclude_patterns = ['_build', 'Thumbs.db', '.DS_Store']


# -- Options for HTML output -------------------------------------------------

# The theme to use for HTML and HTML Help pages.  See the documentation for
# a list of builtin themes.
#
html_theme = 'sphinx_rtd_theme'

# Theme options are theme-specific and customize the look and feel of a theme
# further.  For a list of options available for each theme, see the
# documentation.
#
html_theme_options = {
    'logo_only': True,
}

# Add any paths that contain custom static files (such as style sheets) here,
# relative to this directory. They are copied after the builtin static files,
# so a file named "default.css" will overwrite the builtin "default.css".
html_static_path = ['_static']

html_context = {
    'css_files': [
        '_static/theme-overrides.css',
    ],
}

html_show_sourcelink = False

html_logo = '../artwork/generated/metalk8s-logo-wide-white-200.png'


# -- Options for HTMLHelp output ---------------------------------------------

# Output file base name for HTML help builder.
htmlhelp_basename = 'MetalK8sdoc'


# -- Options for LaTeX output ------------------------------------------------

latex_elements = {
    # The paper size ('letterpaper' or 'a4paper').
    #
    'papersize': 'a4paper',

    # The font size ('10pt', '11pt' or '12pt').
    #
    'pointsize': '10pt',

    # Additional stuff for the LaTeX preamble.
    #
    'preamble': r'''
        \usepackage{charter}
        \usepackage[defaultsans]{lato}
        \usepackage{inconsolata}
    ''',

    # Latex figure (float) alignment
    #
    # 'figure_align': 'htbp',
}

# Grouping the document tree into LaTeX files. List of tuples
# (source start file, target name, title,
#  author, documentclass [howto, manual, or own class]).
latex_documents = [
    ('index-latex', 'MetalK8s.tex', 'MetalK8s Documentation',
     'Scality', 'manual', True),
]

latex_logo = '../artwork/generated/metalk8s-logo-wide-black.pdf'

latex_toplevel_sectioning = 'part'


# -- Options for manual page output ------------------------------------------

# One entry per manual page. List of tuples
# (source start file, name, description, authors, manual section).
man_pages = [
    (master_doc, 'metalk8s', 'MetalK8s Documentation',
     [author], 1)
]


# -- Options for Texinfo output ----------------------------------------------

# Grouping the document tree into Texinfo files. List of tuples
# (source start file, target name, title, author,
#  dir menu entry, description, category)
texinfo_documents = [
    (master_doc, 'MetalK8s', 'MetalK8s Documentation',
     author, 'MetalK8s', 'One line description of project.',
     'Miscellaneous'),
]


# -- Extension configuration -------------------------------------------------

# -- Options for todo extension ----------------------------------------------

# If true, `todo` and `todoList` produce output, else they produce nothing.
todo_include_todos = not tags.has('release')

# -- Options for sphinxcontrib-spelling --------------------------------------
# See http://sphinxcontrib-spelling.readthedocs.io/en/latest/customize.html
spelling_word_list_filename = 'spelling-wordlist.txt'

# -- Options for metalk8s_sphinxext_googleanalytics --------------------------
# See _lib/metalk8s_sphinxext_googleanalytics.py
googleanalytics_id = 'UA-78443762-1'
googleanalytics_enabled = ON_RTD

# -- Options for sphinxcontrib_github_alt ------------------------------------
# See https://pypi.org/project/sphinxcontrib_github_alt/
github_project_url = 'https://github.com/Scality/metalk8s'

# -- Options for sphinx.ext.intersphinx --------------------------------------
# See http://www.sphinx-doc.org/en/stable/ext/intersphinx.html
intersphinx_mapping = {}
