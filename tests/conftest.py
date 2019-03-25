import pathlib


# Pytest command-line options
def pytest_addoption(parser):
    parser.addoption(
        "--iso-root",
        action="store",
        default="_build/root",
        type=pathlib.Path,
        help="Root of the ISO file tree."
    )

    parser.addoption(
        "--bootstrap-ip",
        action="store",
        default=None,
        help="Reachable IP of the bootstrap node."
    )

    parser.addoption(
        "--skip-tls-verify",
        action="store_true",
        default=False,
        help="Skip TLS verification when calling kube-apiserver."
    )
