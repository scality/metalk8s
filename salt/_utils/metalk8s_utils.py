"""Utility methods for MetalK8s modules.
"""

MISSING_DEPS = []

try:
    import requests
    from requests.adapters import HTTPAdapter
    from requests.packages.urllib3.util.retry import Retry
except ImportError:
    MISSING_DEPS.append("requests")

__virtualname__ = "metalk8s"


def __virtual__():
    if MISSING_DEPS:
        error_msg = f"Missing dependencies: {', '.join(MISSING_DEPS)}"
        return False, error_msg

    return __virtualname__


# Source: https://www.peterbe.com/plog/best-practice-with-retries-with-requests
def requests_retry_session(
    retries=3, backoff_factor=0.3, status_forcelist=(500, 503), session=None
):
    """Configure a `requests.session` for retry on error.

    By default, this helper performs 3 retries with an exponential sleep
    interval between each request and only retries internal server errors(500)
    & service unavailable errors(503)

    Arguments:
        retries:          The number of retries to perform before giving up
        backoff_factor:   The sleep interval between requests computed as
                          {backoff factor} * (2 ^ ({number retries} - 1))
        status_forcelist: HTTP status codes that we should force a retry on
        session:          Used to create a session

    Returns:
        A `requests.Session` object configured for retry.
    """
    session = session or requests.Session()
    retry = Retry(
        total=retries,
        read=retries,
        connect=retries,
        backoff_factor=backoff_factor,
        status_forcelist=status_forcelist,
    )
    adapter = HTTPAdapter(max_retries=retry)
    session.mount("http://", adapter)
    session.mount("https://", adapter)
    return session
