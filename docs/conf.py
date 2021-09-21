# Configuration file for the Sphinx documentation builder.
#
# This file only contains a selection of the most common options. For a full
# list see the documentation:
# http://www.sphinx-doc.org/en/master/config

import datetime
import os
import pathlib
import subprocess
import sys
import yaml

# -- Path setup --------------------------------------------------------------

# If extensions (or modules to document with autodoc) are in another directory,
# add these directories to sys.path here. If the directory is relative to the
# documentation root, use os.path.abspath to make it absolute, like shown here.

_lib_path = pathlib.Path(__file__).parent / "_lib"
sys.path.insert(0, str(_lib_path.resolve()))

# MetalK8s Buildchain
_buildchain_path = pathlib.Path(__file__) / "../../buildchain"
sys.path.insert(0, str(_buildchain_path.resolve()))
from buildchain import constants
from buildchain import versions

# `lib_alert_tree` tooling library
_lib_alert_tree_path = pathlib.Path(__file__) / "../../tools/lib-alert-tree"
sys.path.insert(0, str(_lib_alert_tree_path.resolve()))


# -- Environment toggles -----------------------------------------------------

ON_RTD = os.environ.get("READTHEDOCS") == "True"

# -- Project information -----------------------------------------------------

project = "MetalK8s"
copyright = "{}, Scality".format(datetime.datetime.now().year)
author = "Scality"

# Used for finding the project logo and defining some links
project_identifier = "metalk8s"

# The full version, including alpha/beta/rc tags
version = versions.VERSION

# The full git reference if this is a developemnt release (otherwise, leave it
# empty)
if versions.VERSION_SUFFIX == "-dev":
    release = constants.GIT_REF

    # NOTE: we use this tag to show a warning message with more details about
    # a given release in `introduction.rst`
    tags.add("unreleased")
else:
    release = ""

# One can manually add the 'release' tag when building to obtain similar
# results as when built from the latest tag
if tags.has("release"):
    RELEASE_BUILD = True
    tags.remove("unreleased")

    _latest_tag_out = subprocess.check_output(
        ["git", "describe", "--abbrev=0"],
    )
    version = _latest_tag_out.decode("utf-8").rstrip()
    release = ""
else:
    RELEASE_BUILD = not tags.has("unreleased")

# Read general information from Salt defaults
with open("../salt/metalk8s/defaults.yaml", "r") as fd:
    salt_defaults = yaml.safe_load(fd)

if not salt_defaults["metalk8s"]["downgrade"]["enabled"]:
    tags.add("downgrade_not_supported")

# Read volume examples
with open("_infos/volumes.yaml", "r") as fd:
    volumes_values = yaml.safe_load(fd)

for infos in volumes_values["volume_types"].values():
    with open(infos["example"]["path"]) as fd:
        infos["example"]["content"] = fd.read()


# -- General configuration ---------------------------------------------------

# Add any Sphinx extension module names here, as strings. They can be
# extensions coming with Sphinx (named 'sphinx.ext.*') or your custom
# ones.
extensions = [
    "sphinx.ext.autodoc",
    "sphinx.ext.todo",
    "sphinx.ext.ifconfig",
    "sphinx.ext.githubpages",
    "sphinx.ext.intersphinx",
    "sphinxcontrib.spelling",
    "sphinxcontrib.plantuml",
    "sphinxcontrib.jinja",
    "sphinxcontrib_github_alt",
]

if ON_RTD:
    extensions.extend(
        [
            "metalk8s_sphinxext_googleanalytics",
        ]
    )

# Add any paths that contain templates here, relative to this directory.
templates_path = ["_templates"]

# The master toctree document.
master_doc = "index"

# List of patterns, relative to source directory, that match files and
# directories to ignore when looking for source files.
# This pattern also affects html_static_path and html_extra_path.
exclude_patterns = ["_build", "Thumbs.db", ".DS_Store"]

if RELEASE_BUILD and not ON_RTD:
    exclude_patterns.append("developer/*")

# -- Options for HTML output -------------------------------------------------

# The theme to use for HTML and HTML Help pages.  See the documentation for
# a list of builtin themes.
#
if ON_RTD:
    html_theme = "sphinx_rtd_theme"
else:
    html_theme = "sphinx_scality"

# Theme options are theme-specific and customize the look and feel of a theme
# further.  For a list of options available for each theme, see the
# documentation.
#

if ON_RTD:
    html_theme_options = {"logo_only": True}
else:
    html_theme_options = {
        "social_links": [
            ("github", "https://www.github.com/scality/metalk8s"),
            ("linkedin", "https://www.linkedin.com/company/scality/"),
            ("twitter", "https://twitter.com/scality"),
            ("instagram", "https://instagram.com/scalitylife"),
            ("facebook", "https://www.facebook.com/scality/"),
        ],
    }

    # Build tag for Scality product documentation
    if tags.has("scality_product"):
        _kblink = "https://support.scality.com/hc/en-us"
        _homelink = "https://documentation.scality.com"
        html_theme_options["footer_links"] = [
            ("Support", "https://support.scality.com"),
            ("Knowledge Base", _kblink),
            ("Training", "https://training.scality.com"),
        ]
        html_theme_options["kblink"] = _kblink
        html_theme_options["homelink"] = _homelink
        html_theme_options["parentlink"] = _homelink + "/metalk8s"
    else:
        html_theme_options["footer_links"] = [
            ("Support", "https://www.github.com/scality/metalk8s/issues"),
        ]

    html_theme_options["footer_links"].append(
        ("Privacy Policy", "https://www.scality.com/privacy-policy/")
    )

# Add any paths that contain custom static files (such as style sheets) here,
# relative to this directory. They are copied after the builtin static files,
# so a file named "default.css" will overwrite the builtin "default.css".
html_static_path = ["_static"]

html_context = {
    "css_files": [
        "_static/theme-overrides.css",
    ],
}

html_show_sourcelink = False

if ON_RTD:
    html_logo = "../artwork/generated/metalk8s-logo-wide-white-200.png"
else:
    html_logo = "../artwork/generated/metalk8s-logo-wide-black-400.png"

# -- Options for HTMLHelp output ---------------------------------------------

# Output file base name for HTML help builder.
htmlhelp_basename = "MetalK8sdoc"


# -- Options for LaTeX output ------------------------------------------------

latex_elements = {
    # The paper size ('letterpaper' or 'a4paper').
    #
    "papersize": "a4paper",
    # The font size ('10pt', '11pt' or '12pt').
    #
    "pointsize": "10pt",
    # Additional stuff for the LaTeX preamble.
    #
    "preamble": r"""
        \usepackage{charter}
        \usepackage[defaultsans]{lato}
        \usepackage{inconsolata}
    """,
    # Latex figure (float) alignment
    #
    # 'figure_align': 'htbp',
}

# Grouping the document tree into LaTeX files. List of tuples
# (source start file, target name, title,
#  author, documentclass [howto, manual, or own class]).
latex_documents = [
    (
        "{}-latex".format(master_doc),
        "MetalK8s.tex",
        "MetalK8s Documentation",
        "Scality",
        "manual",
        True,
    ),
]

latex_logo = "../artwork/generated/metalk8s-logo-wide-black.pdf"

latex_toplevel_sectioning = "part"


# -- Options for manual page output ------------------------------------------

# One entry per manual page. List of tuples
# (source start file, name, description, authors, manual section).
man_pages = [(master_doc, "metalk8s", "MetalK8s Documentation", [author], 1)]


# -- Options for Texinfo output ----------------------------------------------

# Grouping the document tree into Texinfo files. List of tuples
# (source start file, target name, title, author,
#  dir menu entry, description, category)
texinfo_documents = [
    (
        master_doc,
        "MetalK8s",
        "MetalK8s Documentation",
        author,
        "MetalK8s",
        "One line description of project.",
        "Miscellaneous",
    ),
]


# -- Extension configuration -------------------------------------------------

# -- Options for todo extension ----------------------------------------------

# If true, `todo` and `todoList` produce output, else they produce nothing.
todo_include_todos = not RELEASE_BUILD

# -- Options for sphinxcontrib-spelling --------------------------------------
# See http://sphinxcontrib-spelling.readthedocs.io/en/latest/customize.html
spelling_word_list_filename = "spelling-wordlist.txt"

# -- Options for metalk8s_sphinxext_googleanalytics --------------------------
# See _lib/metalk8s_sphinxext_googleanalytics.py
googleanalytics_id = "UA-78443762-1"
googleanalytics_enabled = ON_RTD

# -- Options for sphinxcontrib_github_alt ------------------------------------
# See https://pypi.org/project/sphinxcontrib_github_alt/
github_project_url = "https://github.com/scality/metalk8s"

# -- Options for sphinx.ext.intersphinx --------------------------------------
# See http://www.sphinx-doc.org/en/stable/ext/intersphinx.html
intersphinx_mapping = {}

# -- Options for sphinxcontrib.jinja -----------------------------------------
# See https://pypi.org/project/sphinx-jinja/
jinja_contexts = {
    "base": {
        "metadata": {
            "mode": "release" if RELEASE_BUILD else "development",
            "git_revision": constants.GIT_REF,
            "on_readthedocs": ON_RTD,
        },
    },
    "salt_values": {
        "listening_processes": salt_defaults["networks"]["listening_process_per_role"],
    },
    "volume_values": volumes_values,
}
