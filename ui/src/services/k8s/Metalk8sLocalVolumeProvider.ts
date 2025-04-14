import { V1PersistentVolume } from '@kubernetes/client-node';
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

export enum HardwareDiskType {
  SATA = 'SATA',
  NVMe = 'NVMe',
}

export type HardwareDisk = {
  IP: string;
  devicePath: string;
  type: HardwareDiskType;
};

type LocalVolumeInfo = {
  IP: string;
  devicePath: string;
  nodeName: string;
  volumeType: VolumeType;
};

export type LocalPersistentVolume = V1PersistentVolume & LocalVolumeInfo;

type LocalVolume = LocalVolumeInfo & { volumeName: string };

export default class Metalk8sLocalVolumeProvider {
  apiUrl: string;
  constructor(apiUrl: string, private getToken: () => Promise<string>) {
    this.apiUrl = apiUrl;
  }

  public listLocalPersistentVolumes = async (
    serverName: string,
  ): Promise<LocalPersistentVolume[]> => {
    try {
      const token = await this.getToken();
      const { coreV1, customObjects } = ApiK8s.updateApiServerConfig(
        this.apiUrl,
        token,
      );
      const volumeClient = new Metalk8sV1alpha1VolumeClient(customObjects);
      const k8sClient = coreV1;

      const nodes = await k8sClient.listNode();
      const nodeIP = nodes.body.items
        .find((node) => node.metadata.name === serverName)
        ?.status.addresses.find((address) => address.type === 'InternalIP');

      if (!nodeIP) {
        throw new Error(`Failed to find IP for node ${serverName}`);
      }

      const volumes = await volumeClient.getMetalk8sV1alpha1VolumeList();

      if (!isError(volumes)) {
        const nodeVolumes = volumes.body.items.filter(
          (volume) => volume.spec.nodeName === serverName,
        );
        const pv = await k8sClient.listPersistentVolume();

        const localPv = nodeVolumes.reduce((acc, item) => {
          const isLocalPv = pv.body.items.find(
            (p) => p.metadata.name === item.metadata['name'],
          );

          return [
            ...acc,
            {
              ...isLocalPv,
              IP: nodeIP.address,
              devicePath: item.status.deviceName
                ? `/dev/${item.status.deviceName}`
                : item.metadata['name'],
              nodeName: item.spec.nodeName,
              volumeType: item.spec.rawBlockDevice
                ? VolumeType.Hardware
                : VolumeType.Virtual,
            },
          ];
        }, [] as LocalPersistentVolume[]);

        return localPv;
      } else {
        throw new Error(`${volumes.error.message}`);
      }
    } catch (error) {
      throw new Error(
        `Failed to fetch local persistent volumes: ${error.message}`,
      );
    }
  };

  // Since we don't have unique Serial Number for the disks, we need to retrieve the Volume Name from the PV.
  public detachVolume = async (
    localPV: LocalPersistentVolume,
  ): Promise<void> => {
    // The volume name is the same as the PV name
    const volumeName = localPV.metadata.name;
    const token = await this.getToken();
    const { customObjects } = ApiK8s.updateApiServerConfig(this.apiUrl, token);
    const volumeClient = new Metalk8sV1alpha1VolumeClient(customObjects);

    try {
      const deleteVolume = await volumeClient.deleteMetalk8sV1alpha1Volume(
        volumeName,
      );

      if (isError(deleteVolume)) {
        throw new Error(
          `Failed to delete MetalK8s volume ${volumeName}: ${deleteVolume.error.message}`,
        );
      }
    } catch (error) {
      throw new Error(
        `Failed to delete MetalK8s volume ${volumeName}: ${
          error instanceof Error ? error.message : JSON.stringify(error)
        }`,
      );
    }
  };

  public isVolumeProvisioned = async (
    localVolume: LocalVolume,
  ): Promise<false | LocalPersistentVolume> => {
    const volumeName = localVolume.volumeName;

    const token = await this.getToken();
    const { customObjects } = ApiK8s.updateApiServerConfig(this.apiUrl, token);
    const volumeClient = new Metalk8sV1alpha1VolumeClient(customObjects);

    if (isError(volumeClient)) {
      throw new Error('Failed to create volume client');
    }

    const volume = await volumeClient.getMetalk8sV1alpha1Volume(volumeName);

    if (isError(volume)) {
      throw new Error(`Failed to get volume ${volumeName}: ${volume.error}`);
    }

    const volumeStatus = volume.body?.status?.conditions?.find(
      (condition) => condition.type === 'Ready',
    );

    if (!volumeStatus) {
      return false;
    }

    if (volumeStatus?.status === 'Unknown') {
      return false;
    }

    if (volumeStatus?.status === 'False') {
      throw new Error(
        `Volume ${volumeName} failed to provisioned: ${volumeStatus.reason} `,
      );
    }

    if (volumeStatus?.status === 'True') {
      const token = await this.getToken();
      const { coreV1 } = ApiK8s.updateApiServerConfig(this.apiUrl, token);
      const k8sClient = coreV1;
      const pv = await k8sClient.readPersistentVolume(volumeName);
      return {
        ...pv.body,
        IP: localVolume.IP,
        devicePath: localVolume.devicePath,
        nodeName: localVolume.nodeName,
        volumeType: localVolume.volumeType,
      };
    }

    return false;
  };

  public attachHardwareVolume = async (
    hardwareDisk: HardwareDisk,
  ): Promise<LocalVolume> => {
    const { IP, devicePath, type } = hardwareDisk;

    const token = await this.getToken();
    const { coreV1, customObjects } = ApiK8s.updateApiServerConfig(
      this.apiUrl,
      token,
    );
    const volumeClient = new Metalk8sV1alpha1VolumeClient(customObjects);
    const k8sClient = coreV1;

    if (isError(volumeClient)) {
      throw new Error(
        `Failed to create volume client: ${volumeClient.error.message}`,
      );
    }
    if (isError(k8sClient)) {
      throw new Error(
        `Failed to create k8s client: ${k8sClient.error.message}`,
      );
    }

    const nodes = await k8sClient.listNode().catch((error) => {
      throw new Error(
        `Failed to fetch nodes: ${
          error instanceof Error ? error.message : JSON.stringify(error)
        }`,
      );
    });

    if (isError(nodes)) {
      throw new Error(`Failed to fetch nodes: ${nodes.error.message}`);
    }
    const nodeName = nodes.body.items.find((node) =>
      node.status.addresses.find(
        (address) => address.type === 'InternalIP' && address.address === IP,
      ),
    )?.metadata.name;
    if (!nodeName) {
      throw new Error(`Failed to find node for IP ${IP}`);
    }
    // The map between hardwareDisk Type and StorageClassName
    // NVMe => SSD
    // the rest=> HDD
    const storageClassName =
      type === HardwareDiskType.NVMe ? 'ssd-ext4' : 'hdd-ext4';

    // It will be changed to Disk Serial Number in the future.
    // K8s API accepts only lowercase letters, numbers and hyphens in names.
    // Replace all slashes with hyphens to make devicePath compatible.
    const volumeName = `storage-data-${IP}${devicePath.replace(/\//g, '-')}`;

    const volume = await volumeClient.createMetalk8sV1alpha1Volume({
      apiVersion: 'storage.metalk8s.scality.com/v1alpha1',
      kind: 'Volume',
      metadata: {
        name: volumeName,
        labels: { 'xcore.scality.com/volume-type': 'data' },
      },
      spec: {
        nodeName,
        rawBlockDevice: { devicePath },
        storageClassName,
        template: {
          metadata: {
            labels: { 'xcore.scality.com/volume-type': 'data' },
          },
        },
      },
    });
    if (isError(volume)) {
      throw new Error(
        `Failed to attach hardware volume: ${volume.error.message}`,
      );
    }

    return {
      IP,
      devicePath,
      nodeName,
      volumeType: VolumeType.Hardware,
      volumeName,
    };
  };
}
