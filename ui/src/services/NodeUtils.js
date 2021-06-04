//@flow
import { createSelector } from 'reselect';
import {
  NODE_ALERTS_GROUP,
  PORT_NODE_EXPORTER,
  STATUS_CRITICAL,
  STATUS_WARNING,
  STATUS_NONE,
  API_STATUS_READY,
  API_STATUS_NOT_READY,
  API_STATUS_UNKNOWN,
  API_STATUS_DEPLOYING,
} from '../constants';
import { compareHealth } from './utils';
import type { IPInterfaces } from './salt/api';
import type { RootState } from '../ducks/reducer';
import type { NodesState } from '../ducks/app/nodes';
import type { Brand } from '../services/api';
import { getHealthStatus, filterAlerts, type Alert } from '../services/alertUtils';

const METALK8S_CONTROL_PLANE_IP = 'metalk8s:control_plane_ip';
const METALK8S_WORKLOAD_PLANE_IP = 'metalk8s:workload_plane_ip';
const IP_INTERFACES = 'ip_interfaces';

// Note that: Reverse the selectors and result in order to type unknown number of selectors.
export const createTypedSelector: <T>(
  selectorsResult: (...result: any) => T,
  ...selectors: ((state: RootState) => any)[]
) => T = (selectorsResult, ...selectors) =>
  createSelector(...selectors, selectorsResult);

type NodetableList = {
  name: { name: string, controlPlaneIP: string, workloadPlaneIP: string },
  status: {
    status: 'ready' | 'not_ready' | 'unknown',
    conditions: (
      | 'DiskPressure'
      | 'MemoryPressure'
      | 'PIDPressure'
      | 'NetworkUnavailable'
      | 'Unschedulable'
    )[],
    statusTextColor: string,
    computedStatus: [],
  },
  health: {
    health: 'health' | 'warning' | 'critical' | 'none',
    totalAlertsCounter: number,
    criticalAlertsCounter: number,
    warningAlertsCounter: number,
  },
  roles: string,
}[];

const IPsInfoSelector = (state) => state.app.nodes.IPsInfo;
const nodesSelector = (state) => state.app.nodes.list;

// Return the data used by the Node list table
export const getNodeListData = (alerts: Array<Alert>, brand: Brand) => createTypedSelector<NodetableList>(
  (
    nodes: $PropertyType<NodesState, 'list'>,
    nodeIPsInfo: NodesState
  ) => {
    const mapped =
      nodes.map((node) => {
        const conditions = node.conditions;
        const IPsInfo = nodeIPsInfo[node.name];
        let statusTextColor, health;

        const alertsNode = filterAlerts(alerts, {
          alertname: NODE_ALERTS_GROUP,
          instance: `${node.internalIP}:${PORT_NODE_EXPORTER}`,
        });

        const totalAlertsCounter = alertsNode.length;
        const criticalAlertsCounter = alertsNode.filter(
          (alert) => alert.labels.severity === STATUS_CRITICAL,
        ).length;
        const warningAlertsCounter = alertsNode.filter(
          (alert) => alert.labels.severity === STATUS_WARNING,
        ).length;

        health = getHealthStatus(alertsNode);
        const computedStatus = [];
        /*  The rules of the color of the node status
         <green>  when status.conditions['Ready'] == True and all other conditions are false
         <yellow> when status.conditions['Ready'] == True and some other conditions are true
         <red>    when status.conditions['Ready'] == False
         <grey>   when there is no status.conditions */
          if (node.status === API_STATUS_READY && conditions.length === 0) {
            statusTextColor = brand.statusHealthy;
            computedStatus.push(API_STATUS_READY);
          } else if (
            node.status === API_STATUS_READY &&
            conditions.length !== 0
          ) {
            statusTextColor = brand.statusWarning;
            conditions.map((cond) => {
              return computedStatus.push(cond);
            });
          } else if (node.deploying && node.status === API_STATUS_UNKNOWN) {
            statusTextColor = brand.textSecondary;
            computedStatus.push(API_STATUS_DEPLOYING);
            health = STATUS_NONE;
          } else if (node.status !== API_STATUS_READY) {
            statusTextColor = brand.statusCritical;
            computedStatus.push(API_STATUS_NOT_READY);
            health = STATUS_NONE;
          } else {
            statusTextColor = brand.textSecondary;
            computedStatus.push(API_STATUS_UNKNOWN);
            health = STATUS_NONE;
          }

        return {
          // According to the design, the IPs of Control Plane and Workload Plane are in the same Cell with Name
          name: {
            name: node.name,
            controlPlaneIP: IPsInfo?.controlPlane?.ip,
            workloadPlaneIP: IPsInfo?.workloadPlane?.ip,
          },
          status: {
            status: node.status,
            conditions: node.conditions,
            statusTextColor,
            computedStatus,
          },
          roles: node.roles,
          health: {
            health,
            totalAlertsCounter,
            criticalAlertsCounter,
            warningAlertsCounter,
          },
        };
      }) || [];

    return mapped.sort((a, b) =>
      compareHealth(b.health.health, a.health.health),
    );
  },
  nodesSelector,
  IPsInfoSelector,
);

/*
This function returns the IP and interface of Control Plane and Workload Plane for each Node
Arguments:
  ipsInterfacesObject = {
    ip_interface: {
      eth1:['10.0.1.42', 'fe80::f816:3eff:fe25:5843'],
      eth3:['10.100.0.2', 'fe80::f816:3eff:fe37:2f34']
   },
    metalk8s:control_plane_ip: "10.0.1.42",
    metalk8s:workload_plane_ip: "10.100.0.2"
  }
Return
  {
   controlPlane: { ip: '10.0.1.42', interface: 'eth1'}
   workloadPlane: { ip: '10.100.0.2', interface: 'eth3'},
  }

Note: the ipsInterfacesObject maybe also be a string with error message

ipsInterfacesObject =
  "nodename": "Minion did not return. [No response]\nThe minions may not have all finished running and any remaining minions will return upon completion. To look up the return data for this job later, run the following command:\n\nsalt-run jobs.lookup_jid 20210429184411623617"
*/
export const nodesCPWPIPsInterface = (
  IPsInterfacesObject: IPInterfaces | false | string,
): {
  controlPlane: { ip: string, interface: string },
  workloadPlane: { ip: string, interface: string },
} => {
  if (!IPsInterfacesObject || typeof IPsInterfacesObject === 'string') {
    return {
      controlPlane: { ip: '', interface: '' },
      workloadPlane: { ip: '', interface: '' },
    };
  }

  return {
    controlPlane: {
      ip: IPsInterfacesObject[METALK8S_CONTROL_PLANE_IP],
      interface:
        Object.keys(IPsInterfacesObject[IP_INTERFACES]).find((en) =>
          IPsInterfacesObject[IP_INTERFACES][en].includes(
            IPsInterfacesObject[METALK8S_CONTROL_PLANE_IP],
          ),
        ) || '',
    },
    workloadPlane: {
      ip: IPsInterfacesObject[METALK8S_WORKLOAD_PLANE_IP],
      interface:
        Object.keys(IPsInterfacesObject[IP_INTERFACES]).find((en) =>
          IPsInterfacesObject[IP_INTERFACES][en].includes(
            IPsInterfacesObject[METALK8S_WORKLOAD_PLANE_IP],
          ),
        ) || '',
    },
  };
};
