import { fromMilliSectoAge } from './utils.js';

// Return the pod list for the Pod Tab in Node Page
export const getPodsListData = (nodeName, pods) => {
  const podsList = pods?.filter((pod) => pod.nodeName === nodeName);

  return (
    podsList?.map((pod) => {
      const age = fromMilliSectoAge(new Date() - pod.startTime);

      const numContainer = pod?.containerStatuses?.length;
      const containerReady =
        pod?.containerStatuses?.filter((pCS) => pCS.ready === true) ?? [];
      return {
        name: pod.name,
        age: age,
        namespace: pod.namespace,
        status: {
          status: `${pod.status} (${containerReady.length}/${numContainer})`,
          isAllContainerRunning: containerReady.length === numContainer,
        },
        log: pod.name,
      };
    }) ?? []
  );
};
