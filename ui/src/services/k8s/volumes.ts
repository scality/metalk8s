import { handleUnAuthorizedError } from '../errorhandler';
import { CoreV1Api } from '@kubernetes/client-node/dist/gen/api/coreV1Api';
import { StorageV1Api } from '@kubernetes/client-node/dist/gen/api/storageV1Api';

export class StorageApi {
  constructor(private coreV1: CoreV1Api, private storage: StorageV1Api) {}
  async getPersistentVolumes() {
    try {
      return await this.coreV1.listPersistentVolume();
    } catch (error) {
      return handleUnAuthorizedError({
        error,
      });
    }
  }
  async getStorageClass() {
    try {
      return await this.storage.listStorageClass();
    } catch (error) {
      return handleUnAuthorizedError({
        error,
      });
    }
  }
  async getPersistentVolumeClaims() {
    try {
      return await this.coreV1.listPersistentVolumeClaimForAllNamespaces();
    } catch (error) {
      return handleUnAuthorizedError({
        error,
      });
    }
  }
}
