export const data = {
  return: [
    {
      '20190527213228970129': {
        Result: {
          bootstrap_master: {
            return: {
              fun_args: [],
              jid: '20190527213228970129',
              return: {
                outputter: 'highstate',
                data: {
                  bootstrap_master: {
                    'salt_|-Set grains_|-Set grains_|-state': {
                      comment: 'Updating node1 failed',
                      name: 'Set grains',
                      start_time: '21:33:33.408716',
                      result: false,
                      duration: 1478.199,
                      __run_num__: 3,
                      __jid__: '20190527213333559560',
                      __sls__: 'metalk8s.orchestrate.deploy_node',
                      changes: {
                        ret: {
                          node1: {
                            'grains_|-Set control_plane_ip grain_|-metalk8s:control_plane_ip_|-present': {
                              comment:
                                'Set grain metalk8s:control_plane_ip to 172.21.254.12',
                              name: 'metalk8s:control_plane_ip',
                              start_time: '21:33:34.750189',
                              result: false,
                              duration: 11.342,
                              __run_num__: 0
                            },
                            'grains_|-Set workload_plane_ip grain_|-metalk8s:workload_plane_ip_|-present': {
                              comment:
                                'Set grain metalk8s:workload_plane_ip to 172.21.254.45',
                              name: 'metalk8s:workload_plane_ip',
                              start_time: '21:33:34.761797',
                              result: false,
                              duration: 4.798,
                              __run_num__: 1
                            }
                          }
                        },
                        out: 'highstate'
                      },
                      __id__: 'Set grains'
                    },
                    'metalk8s_drain_|-Drain the node_|-node1_|-node_drained': {
                      comment: 'Eviction complete.',
                      name: 'node1',
                      start_time: '21:33:36.057387',
                      result: true,
                      duration: 259.239,
                      __run_num__: 6
                    },
                    'salt_|-Kill kube-controller-manager on all master nodes_|-ps.pkill_|-function': {
                      comment:
                        'Function ran successfully. Function ps.pkill ran on bootstrap.',
                      name: 'ps.pkill',
                      start_time: '21:34:56.906105',
                      result: true,
                      duration: 350.539,
                      __run_num__: 9,
                      __jid__: '20190527213457035999',
                      __sls__: 'metalk8s.orchestrate.deploy_node',
                      changes: {
                        ret: {
                          bootstrap: {
                            killed: [14939]
                          }
                        },
                        out: 'highstate'
                      },
                      __id__: 'Kill kube-controller-manager on all master nodes'
                    },
                    'salt_|-Deploy salt-minion on a new node_|-Deploy salt-minion on a new node_|-state': {
                      comment: 'States ran successfully. Updating node1.',
                      name: 'Deploy salt-minion on a new node',
                      start_time: '21:32:31.403702',
                      result: true,
                      duration: 48700.922,
                      __run_num__: 0,
                      __jid__: '20190527213237875376'
                    },
                    'module_|-Accept key_|-Accept key_|-run': {
                      comment: 'saltutil.wheel: Success',
                      name: ['saltutil.wheel'],
                      start_time: '21:33:20.106366',
                      result: true,
                      duration: 350.636,
                      __run_num__: 1
                    },
                    'salt_|-Run the highstate_|-Run the highstate_|-state': {
                      comment: 'States ran successfully. Updating node1.',
                      name: 'Run the highstate',
                      start_time: '21:33:36.318055',
                      result: true,
                      duration: 80352.861,
                      __run_num__: 7,
                      __jid__: '20190527213336504932'
                    },
                    'metalk8s_cordon_|-Uncordon the node_|-node1_|-node_uncordoned': {
                      comment: 'Node node1 uncordoned',
                      name: 'node1',
                      start_time: '21:34:56.671443',
                      result: true,
                      duration: 234.004,
                      __run_num__: 8,
                      __sls__: 'metalk8s.orchestrate.deploy_node',
                      changes: {
                        new: {
                          unschedulable: null
                        },
                        old: {
                          unschedulable: true
                        }
                      },
                      __id__: 'Uncordon the node'
                    },
                    'metalk8s_cordon_|-Cordon the node_|-node1_|-node_cordoned': {
                      comment: 'Node node1 cordoned',
                      name: 'node1',
                      start_time: '21:33:35.818960',
                      result: true,
                      duration: 236.41,
                      __run_num__: 5,
                      __sls__: 'metalk8s.orchestrate.deploy_node',
                      changes: {
                        new: {
                          unschedulable: true
                        },
                        old: {
                          unschedulable: false
                        }
                      },
                      __id__: 'Cordon the node'
                    },
                    'salt_|-Refresh the mine_|-mine.update_|-function': {
                      comment:
                        'Function ran successfully. Function mine.update ran on node1, bootstrap.',
                      name: 'mine.update',
                      start_time: '21:33:34.887400',
                      result: true,
                      duration: 927.167,
                      __run_num__: 4,
                      __jid__: '20190527213335026675',
                      __sls__: 'metalk8s.orchestrate.deploy_node',
                      changes: {
                        ret: {
                          node1: true,
                          bootstrap: true
                        },
                        out: 'highstate'
                      },
                      __id__: 'Refresh the mine'
                    },
                    'salt_|-Wait minion available_|-metalk8s_saltutil.wait_minions_|-runner': {
                      comment:
                        "Runner function 'metalk8s_saltutil.wait_minions' executed.",
                      name: 'metalk8s_saltutil.wait_minions',
                      __orchestration__: true,
                      start_time: '21:33:20.457775',
                      result: true,
                      duration: 12949.553,
                      __run_num__: 2,
                      __jid__: '20190527213320824803',
                      __sls__: 'metalk8s.orchestrate.deploy_node',
                      changes: {
                        return: {
                          comment:
                            'All minions matching "node1" responded: node1',
                          result: true
                        }
                      },
                      __id__: 'Wait minion available'
                    }
                  }
                },
                retcode: 0
              },
              success: false,
              _stamp: '2019-05-27T21:32:29.351849',
              user: 'admin',
              fun: 'runner.state.orchestrate'
            }
          }
        },
        StartTime: '2019, May 27 21:32:28.970129',
        Error: 'Cannot contact returner or no job with this jid'
      }
    }
  ]
};
