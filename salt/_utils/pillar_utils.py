"""
Utility module for external pillars.

The utilities contained in this module have no external dependencies, so
they may be imported as is in external pillar modules.
"""

def assert_equals(source_dict, expected_dict):
    """
    Check equality with expected values in dictionary keys.

    Args:
     - source_dict   (dict): the dict containing the keys/values that should
                             conform to expected values
     - expected_dict (dict): the dict containing keys of the `source_dict`, with
                             expected values of those keys as values
    Returns:
     list: empty list if all checks succeeded, list of error message str if
           some checks failed
    """
    error_tplt = "Expected value '{}' for key '{}', got '{}'"

    errors = [
        error_tplt.format(value, key, source_dict.get(key))
        for key, value in expected_dict.items()
        if source_dict.get(key) != value
    ]

    return errors


def assert_keys(source_dict, keys):
    """
    Check key presence within a dict.

    Args:
     - source_dict (dict): the dict for which key presence should be checked
     - keys        (list): the list of keys whose presence should be checked

    Returns:
     list: empty list if all checks succeeded, list of error message str if
           some checks failed
    """
    errors = []
    errors_tplt = "Expected presence of key '{}' in data: {}"

    for key in keys:
        if key not in source_dict:
            errors.append(errors_tplt.format(key, source_dict))

    return errors


def promote_errors(source, key):
    """
    Promote the error list of a dict's key up to toplevel

    Args:
     - source (dict): the dict that should contain the toplevel _errors
     - key     (str): the key whose content may contain errors

    Returns: None
    """
    patch = source[key]
    if patch.get('_errors'):
        source.setdefault("_errors", []).extend(patch.get("_errors"))


def errors_to_dict(error_list):
    """
    From an error list, return a dict with `_errors` key and list value.

    Args:
     - error_list (list): the error list to encapsulate

    Returns:
     dict: a dict with `_errors` key and error list value
    """
    return {'_errors': error_list}
