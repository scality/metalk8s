import pytest


@pytest.fixture(scope="session")
def archive_dir(tmpdir_factory):
    return tmpdir_factory.mktemp("archive")
