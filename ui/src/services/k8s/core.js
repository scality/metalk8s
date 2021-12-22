import { handleUnAuthorizedError } from '../errorhandler';
import { coreV1, appsV1 } from './api';

export async function getNodes() {
  try {
    return await coreV1.listNode();
  } catch (error) {
    return handleUnAuthorizedError({ error });
  }
}

export async function getPods() {
  try {
    return await coreV1.listPodForAllNamespaces();
  } catch (error) {
    return handleUnAuthorizedError({ error });
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
    return handleUnAuthorizedError({ error });
  }
}

export async function createNode(payload) {
  try {
    return await coreV1.createNode(payload);
  } catch (error) {
    return handleUnAuthorizedError({ error });
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
    return handleUnAuthorizedError({ error });
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
    return handleUnAuthorizedError({ error });
  }
}

export async function createNamespacedConfigMap(name, namespace, restProps) {
  const body = {
    metadata: {
      name,
    },
    ...restProps, //other props for V1ConfigMap: apiVersion, binaryData, data, kind
  };
  try {
    return await coreV1.createNamespacedConfigMap(namespace, body);
  } catch (error) {
    return handleUnAuthorizedError({ error });
  }
}

export async function patchNamespacedConfigMap(
  name,
  namespace,
  { jsonPatch, mergePatch },
) {
  let cTypeHeader;
  let body;
  if (jsonPatch !== undefined) {
    cTypeHeader = 'application/json-patch+json';
    body = jsonPatch;
  } else {
    cTypeHeader = 'application/merge-patch+json';
    body = mergePatch;
  }

  try {
    return await coreV1.patchNamespacedConfigMap(
      name,
      namespace,
      body,
      undefined,
      undefined,
      { headers: { 'Content-Type': cTypeHeader } },
    );
  } catch (error) {
    return handleUnAuthorizedError({ error });
  }
}

export async function getNamespacedDeployment(name, namespace) {
  try {
    return await appsV1.readNamespacedDeployment(name, namespace);
  } catch (error) {
    return handleUnAuthorizedError({ error });
  }
}

export async function readNode(name) {
  try {
    return await coreV1.readNode(name);
  } catch (error) {
    return handleUnAuthorizedError({ error });
  }
}

export async function readNamespacedConfigMap(nameConfigMap, namespace) {
  try {
    return await coreV1.readNamespacedConfigMap(nameConfigMap, namespace);
  } catch (error) {
    return handleUnAuthorizedError({ error });
  }
}
