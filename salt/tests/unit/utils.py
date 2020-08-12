"""
Utils, helpers for testing
"""
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
