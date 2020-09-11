import { createSelector } from 'reselect';

const METALK8S_CONTROL_PLANE_IP = 'metalk8s:control_plane_ip';
const METALK8S_WORKLOAD_PLANE_IP = 'metalk8s:workload_plane_ip';

const nodesIPsInterfacesSelector = (state) =>
  state.app.nodes.nodesIPsInterfaces;
const nodesSelector = (state) => state.app.nodes.list;

// Return the data used by the Node list table
export const getNodeListData = createSelector(
  nodesSelector,
  nodesIPsInterfacesSelector,
  (nodes, nodesIPsInterfaces) => {
    return (
      nodes?.map((node) => {
        return {
          // IPs of Control Plane and Workload Plane are in the same Cell with Name
          name: {
            name: node?.name,
            control_plane_ip:
              (nodesIPsInterfaces[node.name] &&
                nodesIPsInterfaces[node.name][METALK8S_CONTROL_PLANE_IP]) ??
              undefined,
            workload_plane_ip:
              (nodesIPsInterfaces[node.name] &&
                nodesIPsInterfaces[node.name][METALK8S_WORKLOAD_PLANE_IP]) ??
              undefined,
          },
          status: { status: node?.status, conditions: node?.conditions },
          roles: node?.roles,
        };
      }) ?? []
    );
  },
);
