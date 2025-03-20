import { CoreV1Api, V1PersistentVolume } from '@kubernetes/client-node';
import * as ApiK8s from './api';
import {
  Metalk8sV1alpha1VolumeClient,
  Result,
} from './Metalk8sVolumeClient.generated';

function isError<T>(result: Result<T>): result is { error: any } {
  return (result as { error: any }).error !== undefined;
}

export enum VolumeType {
  Hardware = 'Hardware',
  Virtual = 'Virtual',
}

export type LocalPersistentVolume = V1PersistentVolume & {
  IP: string;
  devicePath: string;
  nodeName: string;
  volumeType: VolumeType;
};

export default class Metalk8sLocalVolumeProvider {
  volumeClient: Metalk8sV1alpha1VolumeClient;
  k8sClient: CoreV1Api;
  constructor(url: string, token: string) {
    const { coreV1, customObjects } = ApiK8s.updateApiServerConfig(url, token);
    this.volumeClient = new Metalk8sV1alpha1VolumeClient(customObjects);
    this.k8sClient = coreV1;
  }
  public listLocalPersistentVolumes = async (
    serverName: string,
  ): Promise<LocalPersistentVolume[]> => {
    try {
      const nodes = await this.k8sClient.listNode();
      const nodeIP = nodes.body.items
        .find((node) => node.metadata.name === serverName)
        ?.status.addresses.find((address) => address.type === 'InternalIP');

      if (!nodeIP) {
        throw new Error(`Failed to find IP for node ${serverName}`);
      }

      const volumes = await this.volumeClient.getMetalk8sV1alpha1VolumeList();

      if (!isError(volumes)) {
        const nodeVolumes = volumes.body.items.filter(
          (volume) => volume.spec.nodeName === serverName,
        );
        const pv = await this.k8sClient.listPersistentVolume();

        const localPv = nodeVolumes.reduce((acc, item) => {
          const isLocalPv = pv.body.items.find(
            (p) => p.metadata.name === item.metadata['name'],
          );

          return [
            ...acc,
            {
              ...isLocalPv,
              IP: nodeIP.address,
              devicePath:
                item.spec?.rawBlockDevice?.devicePath || item.status.deviceName,
              nodeName: item.spec.nodeName,
              volumeType: item.spec.rawBlockDevice
                ? VolumeType.Hardware
                : VolumeType.Virtual,
            },
          ];
        }, [] as LocalPersistentVolume[]);

        return localPv;
      } else {
        throw new Error(`Failed to fetch metalk8s volumes: ${volumes.error}`);
      }
    } catch (error) {
      throw new Error(
        `Failed to fetch local persistent volumes: ${error.message}`,
      );
    }
  };
}
