#!/usr/bin/env python

from __future__ import absolute_import, division, print_function
__metaclass__ = type

import argparse
import glob
import itertools
import json
import logging
import os
import os.path
import stat

try:
    import configparser
except ImportError:
    import ConfigParser as configparser


log = logging.getLogger(__name__)


def indent(text, prefix):
    """simplified version of textwrap.indent, python>3.3"""
    def prefixed_lines():
        for line in text.splitlines(True):
            yield (prefix + line)
    return ''.join(prefixed_lines())


class Dashboard:

    DEFAULT_SOURCE = 'DS_DUMMY'

    NOT_A_DASHBOARD_ERROR = "File '{}' doesn't look like a dashboard"

    def __init__(self, filename, name=None, title=None, force=False):
        self.filename = filename
        self.name = name
        self.title = title
        self.force = force
        self._spec = None
        self._basename = None

    def raw(self):
        statinfo = os.stat(self.filename)
        if stat.S_ISDIR(statinfo.st_mode):
            raise ValueError('Dashboard filename cannot be a directory')
        with open(self.filename) as file_:
            return json.load(file_)

    def _load_dashboard(self):
        raw = self.raw()
        spec = raw
        basename = self.filename
        if not self._is_dashboard(raw):
            try:  # Cast one element, raise if more elements
                (basename, spec), = raw.items()
            except ValueError:
                message = self.NOT_A_DASHBOARD_ERROR.format(self.filename)
                self._raise_error(message)
            else:
                if not self._is_dashboard(spec):
                    message = self.NOT_A_DASHBOARD_ERROR.format(self.filename)
                    self._raise_error(message)
        self._spec = spec
        self._basename = basename

    def _raise_error(self, message):
        if not self.force:
            raise ValueError(message)
        else:
            logging.warning(message)

    @property
    def spec(self):
        if self._spec is None:
            self._load_dashboard()
        return self._spec

    @staticmethod
    def _is_dashboard(spec):
        return 'annotations' in spec and 'rows' in spec

    @property
    def source(self):
        """return source of dashboard, None if not found"""
        return self.spec.get('__inputs', [{}])[0].get('name')

    @property
    def basename(self):
        """return the basename of dashboard

        either the name of the file or the single json key
        that host the entire dashboard if any
        """
        if self._basename is None:
            self._load_dashboard()
        return self._basename

    @property
    def grafana_name(self):
        """return basename(of the filename) of the dashboard"""
        prefix = self.name if self.name else \
            os.path.basename(self.basename).replace('.json', '')

        return '{}-dashboard.json'.format(prefix)

    def compute_dashboard_string(self):
        spec = dict(self.spec)
        spec.pop('id', None)  # Clean id
        if self.title:
            spec['title'] = self.title
        json_dashboard = json.dumps({
                'inputs': [{
                    'name': self.source or self.DEFAULT_SOURCE,
                    'type': 'datasource',
                    'pluginId': 'prometheus',
                    'value': 'prometheus'
                }],
                'overwrite': True,
                'dashboard': spec
            },
            sort_keys=True,
            indent=2,
            separators=(',', ': ')
        )
        return '{name}: |+\n{json}'.format(
            name=self.grafana_name,
            json=indent(json_dashboard, ' '*2)
        )


class DashboardAggregator:

    def __init__(self, configfile=None, dashboard_class=Dashboard):
        self.configfile = configfile
        self.dashboard_class = Dashboard
        self._config = None

    def config_by_cli_args(self):
        parser = argparse.ArgumentParser(
            description='Aggregate json dashboard for grafana in kubernetes',
            formatter_class=argparse.ArgumentDefaultsHelpFormatter
        )
        parser.add_argument(
            '--configfile', '-c',
            default='./aggregate_dashboard.ini',
            type=argparse.FileType('r'),
            help='path to the configfile')
        parser.add_argument(
            '--force', '-f', default=False, action='store_true',
            help='force loading of dashboard even if not recognize as such')
        parser.add_argument('--verbose', '-v', action='count', default=0)
        args = parser.parse_args()
        self.configfile = args.configfile
        self.force = args.force
        logging.basicConfig(level=30 - 10 * args.verbose,
                            format='%(levelname)s:%(message)s')

    @property
    def config(self):
        if self._config is None:
            ini_parser = configparser.ConfigParser()
            ini_parser.readfp(self.configfile)
            self._config = ini_parser
        return self._config

    @property
    def configdir(self):
        return os.path.dirname(self.configfile.name)

    def iter_sources(self):
        for section in self.config.sections():
            if section.startswith('source:'):
                yield section

    def iter_filenames_in_source(self, source_name):
        source_path = '{}/{}'.format(self.configdir,
                                     self.config.get(source_name, 'dest'))

        name = None
        try:
            name = self.config.get(source_name, 'name')
        except configparser.NoOptionError:
            pass

        title = None
        try:
            title = self.config.get(source_name, 'title')
        except configparser.NoOptionError:
            pass

        iter_filename = glob.iglob(source_path)
        first_file = next(iter_filename)
        try:
            second_file = next(iter_filename)
        except StopIteration:
            if first_file == source_path and os.path.isdir(source_path):
                assert name is None
                assert title is None
                return  ((path, None, None) for path in
                    glob.iglob('{}/*'.format(source_path)))
            else:
                return iter([(first_file, name, title)])
        else:
            assert name is None
            assert title is None
            return itertools.chain(
                [(first_file, None, None), (second_file, None, None)],
                iter_filename)

    def iter_filenames(self):
        for source in self.iter_sources():
            for filename in self.iter_filenames_in_source(source):
                yield filename

    def get_dashboard(self, filename, name=None, title=None):
        return self.dashboard_class(
            filename, name=name, title=title, force=self.force)

    def run(self):
        target_filename = self.config.get('default', 'target')
        target_path = os.path.join(self.configdir, target_filename)
        with open(target_path, 'w') as target:
            target.write('grafana:\n')
            target.write('  serverDashboardFiles:')
            for (filename, name, title) in self.iter_filenames():
                log.info('Take {}'.format(filename))
                dashboard = self.get_dashboard(filename, name, title)
                target.write('\n')
                target.write(indent(
                    dashboard.compute_dashboard_string(),
                    ' '*4
                ))


if __name__ == '__main__':
    DA = DashboardAggregator()
    DA.config_by_cli_args()
    DA.run()
