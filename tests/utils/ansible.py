"""Helper class and method to programmatically call ansible"""

from __future__ import absolute_import
from __future__ import print_function

import shutil

import ansible.constants as C

from ansible.executor.task_queue_manager import TaskQueueManager
from ansible.inventory.manager import InventoryManager
from ansible.parsing.dataloader import DataLoader
from ansible.playbook.play import Play
from ansible.plugins.callback.default import CallbackModule \
    as CallbackModule_default
from ansible.vars.manager import VariableManager
from collections import namedtuple


class CallbackTestMetalK8s(CallbackModule_default):
    '''Get the failed result and store it in a variable.

    Otherwise, behave exactly like the 'default' callback plugin

    Check :py:class::`AnsibleHelper` documentation to check how to use this
    callback
    '''

    CALLBACK_VERSION = 2.0
    CALLBACK_TYPE = 'stdout'
    CALLBACK_NAME = 'test_metalk8s'

    def __init__(self, ansible_helper, **kwargs):
        '''Take an ansible_helper as argument to store the results

        :param ansible_helper: Instance of AnsibleHelper class
        :type ansbile_helper: :py:class::`AnsibleHelper`
        '''
        self.ansible_helper = ansible_helper
        super(CallbackTestMetalK8s, self).__init__(**kwargs)

    def v2_runner_on_failed(self, result, **kwargs):
        '''Overwrite v2_runner_on_failed method

        Store the results in self.ansible_helper.results when the
        playbook fails and then print the failure like
        the 'default' callback plugin

        The purpose of this CallBack is to store the result for further tests
        when the playbook is failing
        '''

        host = result._host
        self.ansible_helper.results.append(
            dict(host=host, result=result._result))
        super(CallbackTestMetalK8s, self).v2_runner_on_failed(result, **kwargs)


class AnsibleHelper(object):
    '''Help call ansible playbook progrommatically from python API

    To use the class

    ..code::

      mycustom_callback = TestMetalK8sCallback()

      ansible_helper = AnsibleHelper(inventory='/var/tmp/hosts.ini')
      ansible_helper.set_callback = mycustom_callback

      play_source = dict(
          name='Validate inventory',
          hosts=['localhost'],
          gather_facts=False,
          roles=[
              dict(role='preflight_checks'),
          ]
      )

      # if the execution differs from 0, print the results
      if ansible_helper.run(play_source) =! 0:
          print(ansible_helper.results)
    '''

    def __init__(self, sources=None):
        '''Initialize with the helper with an inventory

        It can be either a path or a string representing hosts

        :param str sources: Matcher for a list of ansible hosts
            likely 'localhost,' or a path toward an inventory file
        '''

        self.sources = sources
        self.stdout_callback = 'default'
        self.results = []

        Options = namedtuple(
            'Options',
            [
                'connection', 'module_path', 'forks',
                'become', 'become_method',
                'become_user', 'check', 'diff'
            ]
        )
        self.options = Options(
            connection='local',
            module_path=[],
            forks=10, become=None, become_method=None, become_user=None,
            check=False, diff=False
        )

        self.loader = DataLoader()

        if self.sources:
            self.inventory_manager = InventoryManager(
                loader=self.loader, sources=self.sources)

        self.variable_manager = VariableManager(
            loader=self.loader, inventory=self.inventory_manager)

    def run(self, play_source):
        '''Run the playbook passed as parameter and return the execution code

        Execution code is defined in
        :py:class::`ansible.executor.TaskQueueManager`

        .. code::

          RUN_OK = 0
          RUN_ERROR = 1
          RUN_FAILED_HOSTS = 2
          RUN_UNREACHABLE_HOSTS = 4
          RUN_FAILED_BREAK_PLAY = 8
          RUN_UNKNOWN_ERROR = 255

        Define a playbook and run it

        .. code::

          play_source = dict(
              name='Validate inventory',
              hosts=['localhost'],
              gather_facts=False,
              roles=[
                  dict(role='preflight_checks'),
              ]
          )

          ansible_helper = AnsibleHelper(inventory='localhost,)
          ansible_helper.run(play_source)

        :param dict play_source: Dictionary representing a playbook
        :returns: The exit code of the playbook execution
        :rtype: int
        '''

        play = Play().load(
            play_source,
            variable_manager=self.variable_manager,
            loader=self.loader
        )

        tqm = None
        result = 255  # See below for the meaning
        try:
            tqm = TaskQueueManager(
                inventory=self.inventory_manager,
                variable_manager=self.variable_manager,
                loader=self.loader,
                options=self.options,
                passwords=None,
                stdout_callback=self.stdout_callback,
            )
            # Check ansible.executor.task_queue_manager for meaning of result
            result = tqm.run(play)
        finally:
            if tqm is not None:
                tqm.cleanup()

            # Remove ansible tmpdir
            shutil.rmtree(C.DEFAULT_LOCAL_TMP, True)

        # Return the result
        return result
