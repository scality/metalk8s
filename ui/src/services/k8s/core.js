import { coreV1 } from './api';

export async function getNodes() {
  try {
    return await coreV1.listNode();
  } catch (error) {
    return { error };
  }
}

export async function getPods() {
  try {
    return await coreV1.listPodForAllNamespaces();
  } catch (error) {
    return { error };
  }
}

export async function getKubeSystemNamespace() {
  try {
    return await coreV1.listNamespace(
      null,
      null,
      null,
      'metadata.name=kube-system',
    );
  } catch (error) {
    return { error };
  }
}

export async function createNode(payload) {
  try {
    return await coreV1.createNode(payload);
  } catch (error) {
    return { error };
  }
}

export async function listNamespaces({
  fieldSelector,
  labelSelector,
  limit,
  options = { headers: {} },
}) {
  try {
    return await coreV1.listNamespace(
      undefined, // pretty
      undefined, // allowWatchBookmarks
      undefined, // _continue
      fieldSelector,
      labelSelector,
      limit,
      undefined, // resourceVersion
      undefined, // timeoutSeconds
      undefined, // watch
      options,
    );
  } catch (error) {
    return { error };
  }
}

export async function queryPodInNamespace(namespace, podLabel) {
  try {
    return await coreV1.listNamespacedPod(
      namespace,
      null,
      null,
      null,
      null,
      `app=${podLabel}`,
    );
  } catch (error) {
    return { error };
  }
}
