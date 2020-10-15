import { coreV1, customObjects, storage } from './api';

export async function getVolumes() {
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

export async function deleteVolume(deleteVolumeName) {
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
  try {
    return await coreV1.listPersistentVolume();
  } catch (error) {
    return { error };
  }
}

export async function getStorageClass() {
  try {
    return await storage.listStorageClass();
  } catch (error) {
    return { error };
  }
}

export async function createVolume(body) {
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
  try {
    return await coreV1.listPersistentVolumeClaimForAllNamespaces();
  } catch (error) {
    return { error };
  }
}

export async function getVolumeObject(volumeName) {
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
