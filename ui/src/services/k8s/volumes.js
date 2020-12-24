//@flow
import type {Metalk8sV1Alpha1Volume, Metalk8sV1Alpha1VolumeRequest} from './api';
import { coreV1, customObjects, storage } from './api';

export async function getVolumes(): Promise<{
  body: {items: Metalk8sV1Alpha1Volume[]};
} | { error: any }> {
  if (!customObjects) {
    return { error: 'customObject has not yet been initialized' };
  }
  try {
    // We want to change this hardcoded data later
    return await customObjects.listClusterCustomObject(
      'storage.metalk8s.scality.com',
      'v1alpha1',
      'volumes',
    );
  } catch (error) {
    return { error };
  }
}

export async function deleteVolume(deleteVolumeName: string) {
  if (!customObjects) {
    return { error: 'customObject has not yet been initialized' };
  }
  try {
    return await customObjects.deleteClusterCustomObject(
      'storage.metalk8s.scality.com',
      'v1alpha1',
      'volumes',
      deleteVolumeName,
      {},
    );
  } catch (error) {
    return error;
  }
}

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

export async function createVolume(body: Metalk8sV1Alpha1VolumeRequest) {
  if (!customObjects) {
    return { error: 'customObject has not yet been initialized' };
  }
  try {
    return await customObjects.createClusterCustomObject(
      'storage.metalk8s.scality.com',
      'v1alpha1',
      'volumes',
      body,
    );
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

export async function getVolumeObject(volumeName: string) {
  if (!customObjects) {
    return { error: 'customObject has not yet been initialized' };
  }
  try {
    return await customObjects.getClusterCustomObject(
      'storage.metalk8s.scality.com',
      'v1alpha1',
      'volumes',
      volumeName,
    );
  } catch (error) {
    return { error };
  }
}
