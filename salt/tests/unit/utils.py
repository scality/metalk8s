"""
Utils, helpers for testing
"""


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
