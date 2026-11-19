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
  STATUS_HEALTH,
} from '../constants';
import { compareHealth } from './utils';
import type { PlanesInterfaces } from './salt/api';
import type { RootState } from '../ducks/reducer';
import type { NodesState } from '../ducks/app/nodes';
import type { Alert } from '../services/alertUtils';
import { getHealthStatus, filterAlerts } from '../services/alertUtils';
import { CoreUITheme } from '@scality/core-ui/dist/style/theme';
// Note that: Reverse the selectors and result in order to type unknown number of selectors.
export const createTypedSelector: <T>(
  selectorsResult: (...result: any) => T,
  ...selectors: ((state: RootState) => any)[]
) => T = (selectorsResult, ...selectors) =>
  // @ts-expect-error - FIXME when you are working on it
  createSelector(...selectors, selectorsResult);
type NodetableList = {
  name: {
    name: string;
    controlPlaneIP: string;
    workloadPlaneIP: string;
  };
  status: {
    status: 'ready' | 'not_ready' | 'unknown';
    conditions: ('DiskPressure' | 'MemoryPressure' | 'PIDPressure' | 'NetworkUnavailable' | 'Unschedulable')[];
    statusTextColor: string;
    computedStatus: string[];
  };
  health: {
    health: 'health' | 'warning' | 'critical' | 'none';
    totalAlertsCounter: number;
    criticalAlertsCounter: number;
    warningAlertsCounter: number;
  };
  roles: string;
}[];

const IPsInfoSelector = (state) => state.app.nodes.IPsInfo;

const nodesSelector = (state) => state.app.nodes.list;

// Return the data used by the Node list table
export const getNodeListData = (alerts: Array<Alert>, theme: CoreUITheme) =>
  createTypedSelector<NodetableList>(
    (nodes: NodesState['list'], nodeIPsInfo: NodesState) => {
      const mapped =
        nodes.map((node) => {
          const conditions = node.conditions;
          const IPsInfo = nodeIPsInfo[node.name];
          let statusTextColor, health;
          const alertsNode = filterAlerts(alerts, {
            alertname: NODE_ALERTS_GROUP,
          }).filter(
            (alert) =>
              alert.labels.instance === `${node.internalIP}:${PORT_NODE_EXPORTER}` || alert.labels.node === node.name,
          );
          const totalAlertsCounter = alertsNode.length;
          const criticalAlertsCounter = alertsNode.filter((alert) => alert.labels.severity === STATUS_CRITICAL).length;
          const warningAlertsCounter = alertsNode.filter((alert) => alert.labels.severity === STATUS_WARNING).length;
          health = getHealthStatus(alertsNode);
          const computedStatus = [];

          /*  The rules of the color of the node status
    <green>  when status.conditions['Ready'] == True and all other conditions are false
    <yellow> when status.conditions['Ready'] == True and some other conditions are true
    <red>    when status.conditions['Ready'] == False
    <grey>   when there is no status.conditions */
          if (node.status === API_STATUS_READY && conditions.length === 0) {
            statusTextColor = theme.statusHealthy;
            computedStatus.push(API_STATUS_READY);
          } else if (node.status === API_STATUS_READY && conditions.length !== 0) {
            statusTextColor = theme.statusWarning;
            conditions.map((cond) => {
              return computedStatus.push(cond);
            });
          } else if (node.deploying && node.status === API_STATUS_UNKNOWN) {
            statusTextColor = theme.textSecondary;
            computedStatus.push(API_STATUS_DEPLOYING);
            health = STATUS_NONE;
          } else if (node.status !== API_STATUS_READY) {
            statusTextColor = theme.statusCritical;
            computedStatus.push(API_STATUS_NOT_READY);

            //If no alert is raised on the node but kubernetes
            //report a non-ready node we set the node health to NONE
            //else we set it to the highest alert status raised on the node.
            if (health === STATUS_HEALTH) {
              health = STATUS_NONE;
            }
          } else {
            statusTextColor = theme.textSecondary;
            computedStatus.push(API_STATUS_UNKNOWN);
            health = STATUS_NONE;
          }

          return {
            // According to the design, the IPs of Control Plane and Workload Plane are in the same Cell with Name
            id: node.id,
            name: {
              name: node.name,
              controlPlaneIP: IPsInfo?.controlPlane?.ip,
              workloadPlaneIP: IPsInfo?.workloadPlane?.ip,
              displayName: node?.displayName,
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
      return mapped.sort((a, b) => compareHealth(b.health.health, a.health.health));
    },
    nodesSelector,
    IPsInfoSelector,
  );

/*
This function adapts the `metalk8s_network.get_planes_interfaces` Salt return
into the shape used across the UI.

Arguments:
  planesInterfaces = {
    control_plane: { ip: '10.0.1.42', interface: 'eth1' },
    workload_plane: { ip: '10.100.0.2', interface: 'eth3' },
  }
Return
  {
   controlPlane: { ip: '10.0.1.42', interface: 'eth1'}
   workloadPlane: { ip: '10.100.0.2', interface: 'eth3'},
  }

An `interface` comes back as null when no interface on the node holds the plane
IP; it is normalised to '' here, which callers use to skip the metrics queries
that would otherwise match no series at all.

Note: planesInterfaces may also be a string holding an error message

planesInterfaces =
  "nodename": "Minion did not return. [No response]\nThe minions may not have all finished running and any remaining minions will return upon completion. To look up the return data for this job later, run the following command:\n\nsalt-run jobs.lookup_jid 20210429184411623617"
*/
export const nodesCPWPIPsInterface = (
  planesInterfaces: PlanesInterfaces | false | string,
): {
  controlPlane: {
    ip: string;
    interface: string;
  };
  workloadPlane: {
    ip: string;
    interface: string;
  };
} => {
  if (!planesInterfaces || typeof planesInterfaces === 'string') {
    return {
      controlPlane: {
        ip: '',
        interface: '',
      },
      workloadPlane: {
        ip: '',
        interface: '',
      },
    };
  }

  return {
    controlPlane: {
      ip: planesInterfaces.control_plane?.ip || '',
      interface: planesInterfaces.control_plane?.interface || '',
    },
    workloadPlane: {
      ip: planesInterfaces.workload_plane?.ip || '',
      interface: planesInterfaces.workload_plane?.interface || '',
    },
  };
};
