import { createSelector } from 'reselect';

const METALK8S_CONTROL_PLANE_IP = 'metalk8s:control_plane_ip';
const METALK8S_WORKLOAD_PLANE_IP = 'metalk8s:workload_plane_ip';
const IP_INTERFACES = 'ip_interfaces';

const IPsInfoSelector = (state) => state.app.nodes.IPsInfo;
const nodesSelector = (state) => state.app.nodes.list;

// Return the data used by the Node list table
export const getNodeListData = createSelector(
  nodesSelector,
  IPsInfoSelector,
  (nodes, nodeIPsInfo) => {
    return (
      nodes?.map((node) => {
        const IPsInfo = nodeIPsInfo?.[node.name];
        return {
          // According to the design, the IPs of Control Plane and Workload Plane are in the same Cell with Name
          name: {
            name: node?.name,
            controlPlaneIP: IPsInfo?.controlPlane?.ip,
            workloadPlaneIP: IPsInfo?.workloadPlane?.ip,
          },
          status: { status: node?.status, conditions: node?.conditions },
          roles: node?.roles,
        };
      }) ?? []
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
export const nodesCPWPIPsInterface = (IPsInterfacesObject) => {
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
