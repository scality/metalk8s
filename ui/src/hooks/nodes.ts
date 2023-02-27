import { useEffect } from 'react';
import { useQuery } from 'react-query';
import { useDispatch, useSelector } from 'react-redux';
import * as CoreApi from '../services/k8s/core';
import { nodeKey } from '../services/k8s/core.key';
import {
  API_STATUS_READY,
  API_STATUS_NOT_READY,
  API_STATUS_UNKNOWN,
  REFRESH_TIMEOUT,
} from '../constants';
import { allJobsSelector } from '../ducks/app/salt';
import {
  ROLE_PREFIX,
  FETCH_NODES_IPS_INTERFACES,
  updateNodesAction,
} from '../ducks/app/nodes';
const FIVE_SECOND_IN_MS = 5000;
export function getAllNodesQueryOption(deployingNodes) {
  return {
    queryKey: nodeKey.all,
    queryFn: CoreApi.getNodes,
    select: (data) => {
      return data?.body?.items?.map((node) => {
        const statusType =
          node.status.conditions &&
          node.status.conditions.find((conditon) => conditon.type === 'Ready');
        // Store the name of conditions which the status are True in the array, except "Ready" condition, which we can know from the `status` field.
        // Given the available conditions ("DiskPressure", "MemoryPressure", "PIDPressure", "NetworkUnavailable", "Unschedulable")
        const conditions = node?.status?.conditions?.reduce((acc, cond) => {
          if (cond.status === 'True' && cond?.type && cond?.type !== 'Ready')
            acc.push(cond.type);
          return acc;
        }, []);
        let status;

        if (statusType && statusType.status === 'True') {
          status = API_STATUS_READY;
        } else if (statusType && statusType.status === 'False') {
          status = API_STATUS_NOT_READY;
        } else {
          status = API_STATUS_UNKNOWN;
        }

        // the Roles of the Node should be the ones that are stored in the labels `node-role.kubernetes.io/<role-name>`
        const nodeRolesLabels = Object.keys(
          node.metadata.labels,
        ).filter((label) => label.startsWith(ROLE_PREFIX));
        const nodeRoles = nodeRolesLabels?.map((nRL) => nRL.split('/')[1]);
        return {
          name: node.metadata.name,
          metalk8s_version:
            node.metadata.labels['metalk8s.scality.com/version'],
          status: status,
          conditions: conditions,
          roles: nodeRoles.join(' / '),
          deploying: deployingNodes.includes(node.metadata.name),
          internalIP: node?.status?.addresses?.find(
            (ip) => ip.type === 'InternalIP',
          ).address,
          creationTimestamp: node?.metadata?.creationTimestamp,
          kubeletVersion: node?.status?.nodeInfo?.kubeletVersion,
        };
      });
    },
    staleTime: FIVE_SECOND_IN_MS,
  };
}
export function useRefreshNodes() {
  const dispatch = useDispatch();
  const allJobs = useSelector(allJobsSelector);
  const deployingNodes = allJobs
    .filter((job) => job.type === 'deploy-node' && !job.completed)
    .map((job) => job.node);
  const result = useQuery({
    ...getAllNodesQueryOption(deployingNodes),
    refetchInterval: REFRESH_TIMEOUT,
  });
  const { data, isLoading } = result;
  useEffect(() => {
    let timer;

    if (data) {
      dispatch(
        updateNodesAction({
          list: data,
        }),
      );
      // To make sure that the loader is visible for at least 1s
      timer = setTimeout(
        () =>
          dispatch({
            type: FETCH_NODES_IPS_INTERFACES,
          }),
        1000,
      );
    }

    dispatch(
      updateNodesAction({
        isLoading,
      }),
    );

    if (timer) {
      return () => clearTimeout(timer);
    }
  }, [data, dispatch, isLoading]);
  return result;
}