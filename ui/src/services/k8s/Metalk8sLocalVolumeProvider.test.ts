import { CoreV1Api, CustomObjectsApi } from '@kubernetes/client-node';
import { updateApiServerConfig } from './api';
import Metalk8sLocalVolumeProvider, {
  HardwareDiskType,
  VolumeType,
} from './Metalk8sLocalVolumeProvider';

jest.mock('../k8s/api', () => ({
  updateApiServerConfig: jest.fn(),
}));

const MOCK_GROUP = 'storage.metalk8s.scality.com';
const MOCK_VERSION = 'v1alpha1';
const MOCK_PLURAL = 'volumes';

describe('Metalk8sLocalVolumeProvider', () => {
  let provider: Metalk8sLocalVolumeProvider;
  const mockUrl = 'mock-url';
  const mockToken = jest.fn(() => Promise.resolve('mock-token'));

  const mockCustomObjectsApi = {
    listClusterCustomObject: jest.fn(),
    deleteClusterCustomObject: jest.fn(),
    getClusterCustomObject: jest.fn(),
    createClusterCustomObject: jest.fn(),
  } as unknown as CustomObjectsApi;

  const mockCoreV1Api = {
    listNode: jest.fn(),
    listPersistentVolume: jest.fn(),
    deletePersistentVolume: jest.fn(),
    readPersistentVolume: jest.fn(),
  } as unknown as CoreV1Api;

  beforeEach(() => {
    (updateApiServerConfig as jest.Mock).mockReturnValue({
      coreV1: mockCoreV1Api,
      customObjects: mockCustomObjectsApi,
    });

    provider = new Metalk8sLocalVolumeProvider(mockUrl, mockToken);
  });

  describe('listLocalPersistentVolumes', () => {
    it('should return local persistent volumes for a given node.', async () => {
      (mockCoreV1Api.listNode as jest.Mock).mockResolvedValue({
        body: {
          items: [
            {
              metadata: { name: 'test-node' },
              status: {
                addresses: [
                  { type: 'Hostname', address: 'test-node' },
                  { type: 'InternalIP', address: '192.168.1.100' },
                ],
              },
            },
          ],
        },
      });

      (mockCoreV1Api.listPersistentVolume as jest.Mock).mockResolvedValue({
        body: {
          items: [
            {
              metadata: { name: 'test-volume' },
              spec: {},
            },
          ],
        },
      });

      (
        mockCustomObjectsApi.listClusterCustomObject as jest.Mock
      ).mockResolvedValue({
        body: {
          items: [
            {
              metadata: { name: 'test-volume' },
              spec: {
                nodeName: 'test-node',
                rawBlockDevice: { devicePath: '/dev/sdb' },
              },
              status: {
                deviceName: 'sda',
              },
            },
            {
              metadata: { name: 'test-lvm' },
              spec: {
                nodeName: 'test-node',
                lvmLogicalVolume: { vgName: 'test-lvm', size: '10Gi' },
              },
              status: {
                deviceName: 'test-lvm',
              },
            },
            {
              metadata: { name: 'test-sparseLoop' },
              spec: {
                nodeName: 'test-node',
                sparseLoopDevice: {
                  size: '1Gi',
                },
              },
              status: {
                deviceName: 'loop1',
              },
            },
          ],
        },
      });

      const volumes = await provider.listLocalPersistentVolumes('test-node');

      expect(volumes).toHaveLength(3);
      expect(volumes[0]).toMatchObject({
        IP: '192.168.1.100',
        devicePath: '/dev/sda',
        nodeName: 'test-node',
        volumeType: VolumeType.Hardware,
      });
      expect(volumes[1]).toMatchObject({
        IP: '192.168.1.100',
        devicePath: '/dev/test-lvm',
        nodeName: 'test-node',
        volumeType: VolumeType.Virtual,
      });
      expect(volumes[2]).toMatchObject({
        IP: '192.168.1.100',
        devicePath: '/dev/loop1',
        nodeName: 'test-node',
        volumeType: VolumeType.Virtual,
      });
    });

    it('should raise an error if the node cannot be found', async () => {
      (mockCoreV1Api.listNode as jest.Mock).mockResolvedValue({
        body: { items: [] },
      });

      await expect(
        provider.listLocalPersistentVolumes('non-existent-node'),
      ).rejects.toThrow('Failed to find IP for node non-existent-node');
    });

    it('should raise an error if volume retrieval fails', async () => {
      (mockCoreV1Api.listNode as jest.Mock).mockResolvedValue({
        body: {
          items: [
            {
              metadata: { name: 'test-node' },
              status: {
                addresses: [
                  { type: 'Hostname', address: 'test-node' },
                  { type: 'InternalIP', address: '192.168.1.100' },
                ],
              },
            },
          ],
        },
      });

      (
        mockCustomObjectsApi.listClusterCustomObject as jest.Mock
      ).mockRejectedValue(new Error('Failed to fetch volumes'));

      await expect(
        provider.listLocalPersistentVolumes('test-node'),
      ).rejects.toThrow(
        'Failed to fetch local persistent volumes: Failed to fetch volumes',
      );
    });
  });

  describe('detachVolume', () => {
    it('should detach volume', async () => {
      //S
      (
        mockCustomObjectsApi.deleteClusterCustomObject as jest.Mock
      ).mockResolvedValue({
        body: {},
      });
      //E
      await provider.detachVolume({
        IP: '192.168.1.100',
        devicePath: '/dev/sda',
        volumeType: VolumeType.Hardware,
        nodeName: 'test-node',
        metadata: { name: 'test-volume' },
      });
      //V
      expect(
        mockCustomObjectsApi.deleteClusterCustomObject,
      ).toHaveBeenCalledWith(
        MOCK_GROUP,
        MOCK_VERSION,
        MOCK_PLURAL,
        'test-volume',
        {},
      );
    });

    it('should raise an error if metalk8s volume deletion fails', async () => {
      //S
      (
        mockCustomObjectsApi.deleteClusterCustomObject as jest.Mock
      ).mockRejectedValue(new Error('Failed to delete metalk8s volume'));
      //E+V
      await expect(
        provider.detachVolume({
          IP: '192.168.1.100',
          devicePath: '/dev/sda',
          volumeType: VolumeType.Hardware,
          nodeName: 'test-node',
          metadata: { name: 'test-volume' },
        }),
      ).rejects.toThrow(
        'Failed to delete MetalK8s volume test-volume: Failed to delete metalk8s volume',
      );
    });
  });

  describe('isVolumeProvisioned', () => {
    it('should return false if the volume is not yet provisioned', async () => {
      //S
      (
        mockCustomObjectsApi.getClusterCustomObject as jest.Mock
      ).mockResolvedValue({
        status: { conditions: [{ type: 'Ready', status: 'Unknown' }] },
      });

      //E
      const result = await provider.isVolumeProvisioned({
        IP: '192.168.1.100',
        devicePath: '/dev/sda',
        volumeType: VolumeType.Hardware,
        nodeName: 'test-node',
        volumeName: 'test-volume',
      });
      //V
      expect(result).toBe(false);
    });

    it('should return volume if the volume is provisioned', async () => {
      //S
      (
        mockCustomObjectsApi.getClusterCustomObject as jest.Mock
      ).mockResolvedValue({
        body: { status: { conditions: [{ type: 'Ready', status: 'True' }] } },
      });
      (mockCoreV1Api.readPersistentVolume as jest.Mock).mockResolvedValue({
        status: { phase: 'Bound' },
      });
      //E
      const result = await provider.isVolumeProvisioned({
        IP: '192.168.1.100',
        devicePath: '/dev/sda',
        volumeType: VolumeType.Hardware,
        nodeName: 'test-node',
        volumeName: 'test-volume',
      });
      //V
      expect(result).toMatchObject({
        IP: '192.168.1.100',
        devicePath: '/dev/sda',
        volumeType: VolumeType.Hardware,
        nodeName: 'test-node',
      });
    });

    it('should raise an error if the volume is failed to provisioned', async () => {
      //S
      (
        mockCustomObjectsApi.getClusterCustomObject as jest.Mock
      ).mockResolvedValue({
        body: {
          status: {
            conditions: [
              {
                type: 'Ready',
                status: 'False',
                reason: 'Volume is not provisioned',
              },
            ],
          },
        },
      });
      //E+V
      await expect(
        provider.isVolumeProvisioned({
          IP: '192.168.1.100',
          devicePath: '/dev/sda',
          volumeType: VolumeType.Hardware,
          nodeName: 'test-node',
          volumeName: 'test-volume',
        }),
      ).rejects.toThrow(
        'Volume test-volume failed to provisioned: Volume is not provisioned',
      );
    });
  });

  describe('attachHardwareVolume', () => {
    it('should attach hardware volume', async () => {
      //S
      (mockCoreV1Api.listNode as jest.Mock).mockResolvedValue({
        body: {
          apiVersion: 'v1',
          kind: 'NodeList',
          items: [
            {
              metadata: {
                name: 'test-node',
              },
              status: {
                addresses: [{ type: 'InternalIP', address: '192.168.1.100' }],
              },
            },
          ],
        },
      });
      (
        mockCustomObjectsApi.createClusterCustomObject as jest.Mock
      ).mockResolvedValue({
        metadata: {
          name: 'storage-data-192.168.1.100-dev-sda',
        },
      });
      //E
      const result = await provider.attachHardwareVolume({
        IP: '192.168.1.100',
        devicePath: '/dev/sda',
        type: HardwareDiskType.NVMe,
      });
      //V
      expect(
        mockCustomObjectsApi.createClusterCustomObject,
      ).toHaveBeenCalledWith(
        'storage.metalk8s.scality.com',
        'v1alpha1',
        'volumes',
        {
          apiVersion: 'storage.metalk8s.scality.com/v1alpha1',
          kind: 'Volume',
          metadata: {
            name: 'storage-data-192.168.1.100-dev-sda',
            labels: {
              'xcore.scality.com/volume-type': 'data',
            },
          },
          spec: {
            nodeName: 'test-node',
            rawBlockDevice: { devicePath: '/dev/sda' },
            storageClassName: 'ssd-ext4',
            template: {
              metadata: {
                labels: { 'xcore.scality.com/volume-type': 'data' },
              },
            },
          },
        },
      );
      expect(result).toEqual({
        IP: '192.168.1.100',
        devicePath: '/dev/sda',
        nodeName: 'test-node',
        volumeType: VolumeType.Hardware,
        volumeName: 'storage-data-192.168.1.100-dev-sda',
      });
    });

    it('should raise an error if volume creation fails', async () => {
      //S
      (
        mockCustomObjectsApi.createClusterCustomObject as jest.Mock
      ).mockRejectedValue(new Error('Error'));
      //E+V
      await expect(
        provider.attachHardwareVolume({
          IP: '192.168.1.100',
          devicePath: '/dev/sda',
          type: HardwareDiskType.NVMe,
        }),
      ).rejects.toThrow('Failed to attach hardware volume: Error');
    });

    it('should raise an error if node retrieval fails', async () => {
      //S
      (mockCoreV1Api.listNode as jest.Mock).mockRejectedValue(
        new Error('Error'),
      );
      //E+V
      await expect(
        provider.attachHardwareVolume({
          IP: '192.168.1.100',
          devicePath: '/dev/sda',
          type: HardwareDiskType.NVMe,
        }),
      ).rejects.toThrow('Failed to fetch nodes: Error');
    });
  });
});
