"""
Utils, helpers for testing
"""
import builtins
import functools
import operator

from parameterized import param, parameterized


def cmd_output(retcode=0, stdout=None, stderr=None, pid=12345):
    """
    Simple helper to return a dict representing a salt `cmd.run_all` output
    """
    return {
        'pid': pid,
        'retcode': retcode,
        'stdout': stdout or '',
        'stderr': stderr or ''
    }


def parameterized_from_cases(test_cases):
    return parameterized.expand(
        param.explicit(kwargs=test_case) for test_case in test_cases
    )


def split_path(path, delimiter="."):
    return (
        int(key) if key.isdigit() else key for key in path.split(delimiter)
    )


def get_dict_element(data, path, delimiter="."):
    """Traverse a nested dict with a compound path."""
    return functools.reduce(
        operator.getitem, split_path(path, delimiter), data
    )


# Copied from
# https://github.com/saltstack/salt-testing/blob/develop/salttesting/helpers.py
class ForceImportErrorOn(object):
    '''
    This class is meant to be used in mock'ed test cases which require an
    ``ImportError`` to be raised.
    >>> import os.path
    >>> with ForceImportErrorOn('os.path'):
    ...     import os.path
    ...
    Traceback (most recent call last):
      File "<stdin>", line 2, in <module>
      File "salttesting/helpers.py", line 263, in __import__
        'Forced ImportError raised for {0!r}'.format(name)
    ImportError: Forced ImportError raised for 'os.path'
    >>>
    >>> with ForceImportErrorOn(('os', 'path')):
    ...     import os.path
    ...     sys.modules.pop('os', None)
    ...     from os import path
    ...
    <module 'os' from '/usr/lib/python2.7/os.pyc'>
    Traceback (most recent call last):
      File "<stdin>", line 4, in <module>
      File "salttesting/helpers.py", line 288, in __fake_import__
        name, ', '.join(fromlist)
    ImportError: Forced ImportError raised for 'from os import path'
    >>>
    >>> with ForceImportErrorOn(('os', 'path'), 'os.path'):
    ...     import os.path
    ...     sys.modules.pop('os', None)
    ...     from os import path
    ...
    Traceback (most recent call last):
      File "<stdin>", line 2, in <module>
      File "salttesting/helpers.py", line 281, in __fake_import__
        'Forced ImportError raised for {0!r}'.format(name)
    ImportError: Forced ImportError raised for 'os.path'
    >>>
    '''
    def __init__(self, *module_names):
        self.__module_names = {}
        for entry in module_names:
            if isinstance(entry, (list, tuple)):
                modname = entry[0]
                self.__module_names[modname] = set(entry[1:])
            else:
                self.__module_names[entry] = None

    def patch_import_function(self):
        self.__original_import = builtins.__import__
        builtins.__import__ = self.__fake_import__

    def restore_import_funtion(self):
        builtins.__import__ = self.__original_import

    def __fake_import__(self, name, globals_, locals_, fromlist, level=-1):
        if name in self.__module_names:
            importerror_fromlist = self.__module_names.get(name)
            if importerror_fromlist is None:
                raise ImportError(
                    'Forced ImportError raised for {0!r}'.format(name)
                )

            if importerror_fromlist.intersection(set(fromlist)):
                raise ImportError(
                    'Forced ImportError raised for {0!r}'.format(
                        'from {0} import {1}'.format(
                            name, ', '.join(fromlist)
                        )
                    )
                )

        return self.__original_import(name, globals_, locals_, fromlist, level)

    def __enter__(self):
        self.patch_import_function()
        return self

    def __exit__(self, exc_type, exc_value, traceback):
        self.restore_import_funtion()
