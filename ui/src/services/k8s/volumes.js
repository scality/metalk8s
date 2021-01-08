//@flow
import { coreV1, storage } from './api';

export async function getPersistentVolumes() {
  if (!coreV1) {
    return { error: 'coreV1 has not yet been initialized' };
  }
  try {
    return await coreV1.listPersistentVolume();
  } catch (error) {
    return { error };
  }
}

export async function getStorageClass() {
  if (!storage) {
    return { error: 'storage has not yet been initialized' };
  }
  try {
    return await storage.listStorageClass();
  } catch (error) {
    return { error };
  }
}

export async function getPersistentVolumeClaims() {
  if (!coreV1) {
    return { error: 'coreV1 has not yet been initialized' };
  }
  try {
    return await coreV1.listPersistentVolumeClaimForAllNamespaces();
  } catch (error) {
    return { error };
  }
}
