export const data = {
  fun_args: [
    'metalk8s.orchestrate.deploy_node',
    {
      saltenv: 'metalk8s-2.0',
      pillar: {
        orchestrate: {
          node_name: 'node1'
        }
      }
    }
  ],
  jid: '20190527152722429535',
  return: {
    outputter: 'highstate',
    data: {
      bootstrap_master: {
        'salt_|-Set grains_|-Set grains_|-state': {
          comment: 'States ran successfully. Updating node1.',
          name: 'Set grains',
          start_time: '15:28:25.541001',
          result: true,
          duration: 1318.444,
          __run_num__: 3,
          __jid__: '20190527152825671379'
        },
        'metalk8s_drain_|-Drain the node_|-node1_|-node_drained': {
          comment: 'Eviction complete.',
          name: 'node1',
          start_time: '15:28:28.923923',
          result: true,
          duration: 244.721,
          __run_num__: 6,
          __sls__: 'metalk8s.orchestrate.deploy_node',
          changes: {
            node1: {
              node1: 'drained'
            }
          },
          __id__: 'Drain the node'
        },
        'salt_|-Kill kube-controller-manager on all master nodes_|-ps.pkill_|-function': {
          comment:
            'Function ran successfully. Function ps.pkill ran on node1, bootstrap.',
          name: 'ps.pkill',
          start_time: '15:30:29.425156',
          result: true,
          duration: 347.902,
          __run_num__: 9,
          __jid__: '20190527153029554041',
          __sls__: 'metalk8s.orchestrate.deploy_node',
          changes: {
            ret: {
              node1: null,
              bootstrap: {
                killed: [14909]
              }
            },
            out: 'highstate'
          },
          __id__: 'Kill kube-controller-manager on all master nodes'
        },
        'salt_|-Deploy salt-minion on a new node_|-Deploy salt-minion on a new node_|-state': {
          comment: 'States ran successfully. Updating node1.',
          name: 'Deploy salt-minion on a new node',
          start_time: '15:27:25.134589',
          result: true,
          duration: 47344.676,
          __run_num__: 0,
          __jid__: '20190527152731311813',
          __sls__: 'metalk8s.orchestrate.deploy_node'
        },
        'module_|-Accept key_|-Accept key_|-run': {
          comment: 'saltutil.wheel: Success',
          name: ['saltutil.wheel'],
          start_time: '15:28:12.482345',
          result: true,
          duration: 357.834,
          __run_num__: 1
        },
        'salt_|-Run the highstate_|-Run the highstate_|-state': {
          comment: 'States ran successfully. Updating node1.',
          name: 'Run the highstate',
          start_time: '15:28:29.169805',
          result: true,
          duration: 120024.083,
          __run_num__: 7,
          __jid__: '20190527152829304045'
        },
        'metalk8s_cordon_|-Uncordon the node_|-node1_|-node_uncordoned': {
          comment: 'Node node1 uncordoned',
          name: 'node1',
          start_time: '15:30:29.194902',
          result: true,
          duration: 229.821,
          __run_num__: 8,
          __sls__: 'metalk8s.orchestrate.deploy_node'
        },
        'metalk8s_cordon_|-Cordon the node_|-node1_|-node_cordoned': {
          comment: 'Node node1 cordoned',
          name: 'node1',
          start_time: '15:28:28.688465',
          result: true,
          duration: 232.145,
          __run_num__: 5,
          __sls__: 'metalk8s.orchestrate.deploy_node'
        },
        'salt_|-Refresh the mine_|-mine.update_|-function': {
          comment:
            'Function ran successfully. Function mine.update ran on node1, bootstrap.',
          name: 'mine.update',
          start_time: '15:28:26.859849',
          result: true,
          duration: 1824.89,
          __run_num__: 4,
          __jid__: '20190527152826991322'
        },
        'salt_|-Register the node into etcd cluster_|-state.orchestrate_|-runner': {
          comment: "Runner function 'state.orchestrate' executed.",
          name: 'state.orchestrate',
          __orchestration__: true,
          start_time: '15:30:29.775013',
          result: false,
          duration: 4972.308,
          __run_num__: 10,
          __jid__: '20190527153030131303',
          __sls__: 'metalk8s.orchestrate.deploy_node',
          changes: {
            return: {
              outputter: 'highstate',
              data: {
                bootstrap_master: {
                  'metalk8s_etcd_|-Register host as part of etcd cluster_|-node1_|-member_present': {
                    comment: 'Node added in etcd cluster',
                    name: 'node1',
                    start_time: '15:30:32.771762',
                    result: false,
                    duration: 1965.116,
                    __run_num__: 0,
                    __sls__: 'metalk8s.orchestrate.register_etcd',
                    changes: {
                      peer_urls: 'https://172.21.254.13:2380',
                      client_urls: '',
                      id: 860341623853584300,
                      name: ''
                    },
                    __id__: 'Register host as part of etcd cluster'
                  }
                }
              },
              retcode: 0
            }
          },
          __id__: 'Register the node into etcd cluster'
        },
        'salt_|-Wait minion available_|-metalk8s_saltutil.wait_minions_|-runner': {
          comment: "Runner function 'metalk8s_saltutil.wait_minions' executed.",
          name: 'metalk8s_saltutil.wait_minions',
          __orchestration__: true,
          start_time: '15:28:12.840829',
          result: true,
          duration: 12699.302,
          __run_num__: 2,
          __jid__: '20190527152813179108'
        }
      }
    },
    retcode: 0
  },
  success: false,
  _stamp: '2019-05-27T15:30:34.778305',
  user: 'admin',
  fun: 'runner.state.orchestrate'
};
