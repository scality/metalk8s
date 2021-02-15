import { createSelector } from 'reselect';
import {
  NODE_ALERTS_GROUP,
  PORT_NODE_EXPORTER,
  STATUS_CRITICAL,
  STATUS_WARNING,
  STATUS_HEALTH,
  STATUS_NONE,
  API_STATUS_READY,
  API_STATUS_NOT_READY,
  API_STATUS_UNKNOWN,
  API_STATUS_DEPLOYING,
} from '../constants';
import { compareHealth } from './utils';
import type { IPInterfaces } from './salt/api';

const METALK8S_CONTROL_PLANE_IP = 'metalk8s:control_plane_ip';
const METALK8S_WORKLOAD_PLANE_IP = 'metalk8s:workload_plane_ip';
const IP_INTERFACES = 'ip_interfaces';

const IPsInfoSelector = (state) => state.app.nodes.IPsInfo;
const nodesSelector = (state) => state.app.nodes.list;
const brandSelector = (state) => state.config.theme.brand;
const alertsSelector = (state) => state.app.alerts.list;

// Return the data used by the Node list table
export const getNodeListData = createSelector(
  nodesSelector,
  IPsInfoSelector,
  brandSelector,
  alertsSelector,
  (nodes, nodeIPsInfo, brand, alerts) => {
    const mapped =
      nodes?.map((node) => {
        const IPsInfo = nodeIPsInfo?.[node.name];
        let statusTextColor, health;
        const alertsNode = alerts?.filter(
          (alert) =>
            NODE_ALERTS_GROUP.includes(alert?.labels?.alertname) &&
            `${node.internalIP}:${PORT_NODE_EXPORTER}` ===
              alert.labels.instance,
        );

        const totalAlertsCounter = alertsNode?.length ?? -1;
        const criticalAlertsCounter =
          alertsNode?.filter(
            (alert) => alert.labels.severity === STATUS_CRITICAL,
          )?.length ?? -1;
        const warningAlertsCounter =
          alertsNode?.filter(
            (alert) => alert.labels.severity === STATUS_WARNING,
          )?.length ?? -1;

        if (criticalAlertsCounter > 0) {
          health = STATUS_CRITICAL;
        } else if (warningAlertsCounter > 0) {
          health = STATUS_WARNING;
        } else if (criticalAlertsCounter === 0 && warningAlertsCounter === 0) {
          // We don't know if the Node is health of not ready if there is no alerts
          // so we need to specify the health is none when compute the status later.
          health = STATUS_HEALTH;
        } else {
          health = STATUS_NONE;
        }

        const computedStatus = [];
        // The rules of the color of the node status
        // "green" when status.conditions['Ready'] == True and all other conditions are false
        // "yellow" when status.conditions['Ready'] == True and some other conditions are true
        // "red" when status.conditions['Ready'] == False
        // "grey" when there is no status.conditions
        if (
          node?.status === API_STATUS_READY &&
          node?.conditions.length === 0
        ) {
          statusTextColor = brand?.healthy;
          computedStatus.push(API_STATUS_READY);
        } else if (
          node?.status === API_STATUS_READY &&
          node?.conditions.length !== 0
        ) {
          statusTextColor = brand?.warning;
          nodes.conditions.map((cond) => {
            return computedStatus.push(cond);
          });
        } else if (node.deploying && node.status === API_STATUS_UNKNOWN) {
          statusTextColor = brand?.textSecondary;
          computedStatus.push(API_STATUS_DEPLOYING);
          health = STATUS_NONE;
        } else if (node?.status !== API_STATUS_READY) {
          statusTextColor = brand?.critical;
          computedStatus.push(API_STATUS_NOT_READY);
          health = STATUS_NONE;
        } else {
          statusTextColor = brand?.textSecondary;
          computedStatus.push(API_STATUS_UNKNOWN);
          health = STATUS_NONE;
        }

        return {
          // According to the design, the IPs of Control Plane and Workload Plane are in the same Cell with Name
          name: {
            name: node?.name,
            controlPlaneIP: IPsInfo?.controlPlane?.ip,
            workloadPlaneIP: IPsInfo?.workloadPlane?.ip,
          },
          status: {
            status: node?.status,
            conditions: node?.conditions,
            statusTextColor,
            computedStatus,
          },
          roles: node?.roles,
          health: {
            health,
            totalAlertsCounter,
            criticalAlertsCounter,
            warningAlertsCounter,
          },
        };
      }) ?? [];

    return mapped.sort((a, b) =>
      compareHealth(b.health.health, a.health.health),
    );
  },
);

// This function returns the IP and interface of Control Plane and Workload Plane for each Node
// Arguments:
//  ipsInterfacesObject =
// {
//    ip_interface: {
//      eth1:['10.0.1.42', 'fe80::f816:3eff:fe25:5843'],
//      eth3:['10.100.0.2', 'fe80::f816:3eff:fe37:2f34']
// },
//    metalk8s:control_plane_ip: "10.0.1.42",
//    metalk8s:workload_plane_ip: "10.100.0.2"
// }
// Return
// {
//   control_plane: { ip: '10.0.1.42', interface: 'eth1'}
//   workload_plane: { ip: '10.100.0.2', interface: 'eth3'},
// }
export const nodesCPWPIPsInterface = (
  IPsInterfacesObject: IPInterfaces | boolean,
): {
  control_plane: { ip: string, interface: string },
  workload_plane: { ip: string, interface: string },
} => {
  if (!IPsInterfacesObject) {
    return {
      control_plane: { ip: '', interface: '' },
      workload_plane: { ip: '', interface: '' },
    };
  }
  
  return {
    controlPlane: {
      ip: IPsInterfacesObject[METALK8S_CONTROL_PLANE_IP],
      interface: Object.keys(IPsInterfacesObject[IP_INTERFACES]).find((en) =>
        IPsInterfacesObject[IP_INTERFACES][en].includes(
          IPsInterfacesObject[METALK8S_CONTROL_PLANE_IP],
        ),
      ),
    },
    workloadPlane: {
      ip: IPsInterfacesObject[METALK8S_WORKLOAD_PLANE_IP],
      interface: Object.keys(IPsInterfacesObject[IP_INTERFACES]).find((en) =>
        IPsInterfacesObject[IP_INTERFACES][en].includes(
          IPsInterfacesObject[METALK8S_WORKLOAD_PLANE_IP],
        ),
      ),
    },
  };
};
