import { coreV1, appsV1 } from './api';
import jsonpatch from 'jsonpatch';

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

export async function createNamespacedConfigMap(name, namespace, restProps) {
  const body = {
    metadata: {
      name,
    },
    restProps, //other props for V1ConfigMap: apiVersion, binaryData, data, kind
  };
  try {
    return await coreV1.createNamespacedConfigMap(namespace, body);
  } catch (error) {
    return { error };
  }
}

export async function patchNamespacedConfigMap(name, namespace, patch) {
  // we don't have data prop in ConfigMap, in order to patch solution we need to initialize with a data object
  const body = jsonpatch.apply_patch({ data: {} }, patch.jsonPatch);
  try {
    return await coreV1.patchNamespacedConfigMap(
      name,
      namespace,
      body,
      undefined,
      undefined,
      {
        headers: {
          'Content-Type': 'application/merge-patch+json',
        },
      },
    );
  } catch (error) {
    return { error };
  }
}

export async function getNamespacedDeployment(name, namespace) {
  try {
    return await appsV1.readNamespacedDeployment(name, namespace);
  } catch (error) {
    return { error };
  }
}
