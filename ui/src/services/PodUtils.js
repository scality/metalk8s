import { fromMilliSectoAge } from './utils.js';

// Return the pod list for the Pod Tab in Node Page
export const getPodsListData = (nodeName, pods) => {
  const podsList = pods?.filter((pod) => pod.nodeName === nodeName);
  return (
    podsList?.map((pod) => {
      const age = fromMilliSectoAge(new Date() - pod.startTime);

      const numContainer = pod?.containerStatuses?.length ?? 0;
      const numContainerRunning =
        pod?.containerStatuses?.filter(
          (container) => container.state.running !== undefined,
        )?.length ?? 0;

      return {
        name: pod.name,
        age: age,
        namespace: pod.namespace,
        status: {
          status: pod.status,
          numContainer: numContainer,
          numContainerRunning: numContainerRunning,
        },
        log: pod.name,
      };
    }) ?? []
  );
};
