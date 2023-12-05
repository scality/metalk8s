import { handleUnAuthorizedError } from '../errorhandler';
import { CoreV1Api } from '@kubernetes/client-node/dist/gen/api/coreV1Api';
import { AppsV1Api } from '@kubernetes/client-node/dist/gen/api/appsV1Api';

export class CoreApi {
  constructor(private coreV1: CoreV1Api, private appsV1: AppsV1Api) {}

  async getNodes() {
    try {
      return await this.coreV1.listNode();
    } catch (error) {
      return handleUnAuthorizedError({
        error,
      });
    }
  }
  async getPods() {
    try {
      return await this.coreV1.listPodForAllNamespaces();
    } catch (error) {
      return handleUnAuthorizedError({
        error,
      });
    }
  }
  async getKubeSystemNamespace() {
    try {
      return await this.coreV1.listNamespace(
        null,
        null,
        null,
        'metadata.name=kube-system',
      );
    } catch (error) {
      return handleUnAuthorizedError({
        error,
      });
    }
  }
  async createNode(payload) {
    try {
      return await this.coreV1.createNode(payload);
    } catch (error) {
      return handleUnAuthorizedError({
        error,
      });
    }
  }
  async listNamespaces({
    fieldSelector,
    labelSelector,
    limit,
    options = {
      headers: {},
    },
  }) {
    try {
      return await this.coreV1.listNamespace(
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
      return handleUnAuthorizedError({
        error,
      });
    }
  }
  async queryPodInNamespace(namespace, podLabel) {
    try {
      return await this.coreV1.listNamespacedPod(
        namespace,
        null,
        null,
        null,
        null,
        `app=${podLabel}`,
      );
    } catch (error) {
      return handleUnAuthorizedError({
        error,
      });
    }
  }
  async createNamespacedConfigMap(name, namespace, restProps) {
    const body = {
      metadata: {
        name,
      },
      ...restProps, //other props for V1ConfigMap: apiVersion, binaryData, data, kind
    };

    try {
      return await this.coreV1.createNamespacedConfigMap(namespace, body);
    } catch (error) {
      return handleUnAuthorizedError({
        error,
      });
    }
  }
  async patchNamespacedConfigMap(name, namespace, { jsonPatch, mergePatch }) {
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
      return await this.coreV1.patchNamespacedConfigMap(
        name,
        namespace,
        body,
        undefined,
        undefined,
        {
          headers: {
            'Content-Type': cTypeHeader,
          },
        },
      );
    } catch (error) {
      return handleUnAuthorizedError({
        error,
      });
    }
  }
  async getNamespacedDeployment(name, namespace) {
    try {
      return await this.appsV1.readNamespacedDeployment(name, namespace);
    } catch (error) {
      return handleUnAuthorizedError({
        error,
      });
    }
  }
  async readNode(name) {
    try {
      return await this.coreV1.readNode(name);
    } catch (error) {
      return handleUnAuthorizedError({
        error,
      });
    }
  }
  async readNamespacedConfigMap(nameConfigMap, namespace) {
    try {
      return await this.coreV1.readNamespacedConfigMap(
        nameConfigMap,
        namespace,
      );
    } catch (error) {
      return handleUnAuthorizedError({
        error,
      });
    }
  }
}
