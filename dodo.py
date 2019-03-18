#!/usr/bin/env python3
# coding: utf-8
# pylint:disable=unused-wildcard-import


"""Build entry point."""


from buildchain.build import *
from buildchain.iso import *
from buildchain.lint import *
from buildchain.vagrant import *


DOIT_CONFIG = {
    'default_tasks': ['iso'],
    'cleandep': True,
}
