"""Helper module for managing a SolutionsConfiguration file."""
import argparse
import os.path

import yaml

from metalk8s_cli.exceptions import CommandInitError, CommandError


class SolutionsConfiguration(object):
    KIND = 'SolutionsConfiguration'

    # NOTE: first apiVersion in this list is used when creating a new file
    API_VERSIONS = [
        'solutions.metalk8s.scality.com/{}'.format(version)
        for version in ['v1alpha1']
    ]

    def __init__(self, data, filepath=None):
        api_version = data.get('apiVersion')
        kind = data.get('kind')
        assert api_version and kind, (
            'SolutionsConfiguration must have a `kind` and `apiVersion`.'
        )
        assert kind == self.KIND, (
            'Wrong kind ({}), must be "{}".'.format(kind, self.KIND)
        )
        assert api_version in self.API_VERSIONS, (
            'API version not supported: {}'.format(api_version)
        )
        self.api_version = api_version
        self.archives = data.get('archives', [])
        self.active_versions = data.get('active', {})

        self.filepath = filepath

    def add_archive(self, archive):
        if archive not in self.archives:
            self.archives.append(archive)

    def remove_archive(self, archive):
        try:
            self.archives.remove(archive)
        except ValueError:
            pass

    def activate_solution_version(self, solution, version):
        self.active_versions[solution] = version

    def deactivate_solution(self, solution):
        self.active_versions.pop(solution, None)

    @classmethod
    def read_from_file(cls, filepath, create=False):
        if create and not os.path.isfile(filepath):
            return cls.create_file(filepath)

        try:
            with open(filepath, 'r') as fd:
                data = yaml.safe_load(fd)
        except (yaml.YAMLError, IOError) as exc:
            raise CommandInitError(
                "Invalid {} file (located at {}): {}".format(
                    cls.KIND, filepath, str(exc)
                )
            )

        return cls(data, filepath)

    @classmethod
    def create_file(cls, filepath):
        dirpath = os.path.dirname(filepath)
        if not os.path.isdir(dirpath):
            os.makedirs(dirpath)

        data = {'apiVersion': cls.API_VERSIONS[0], 'kind': cls.KIND}
        config = cls(data, filepath)
        config.write_to_file()
        return config

    def write_to_file(self, filepath=None):
        if filepath is None:
            filepath = self.filepath

        try:
            with open(filepath, 'w') as fd:
                yaml.dump(self.data, fd)
        except (yaml.YAMLError, IOError) as exc:
            raise CommandError(
                "Failed to write {} to file {}: {}".format(
                    self.KIND, filepath, str(exc)
                )
            )

    @property
    def data(self):
        return {
            'apiVersion': self.api_version,
            'kind': self.KIND,
            'archives': self.archives,
            'active': self.active_versions,
        }


def config_from_file(filepath):
    # NOTE: if the file is absent, we'll create one, but if it exists
    # already, we won't overwrite it
    try:
        return SolutionsConfiguration.read_from_file(filepath, create=True)
    except CommandInitError as exc:
        raise argparse.ArgumentTypeError(str(exc))


def build_solutions_config_parser():
    """Allow customizing the config file path for Solutions commands.

    Automatically casts the result as a `SolutionsConfiguration` object.
    """
    parser = argparse.ArgumentParser(add_help=False)
    parser.add_argument('--solutions-config',
                        type=config_from_file,
                        default='/etc/metalk8s/solutions.yaml')
    return parser
