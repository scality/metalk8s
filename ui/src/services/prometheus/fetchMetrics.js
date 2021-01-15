// @flow
import { queryPrometheus } from './api';
import { PORT_NODE_EXPORTER } from '../../constants';

export function queryNodeFSAvail(instanceIP: string): Promise<Object> {
  // All system partitions, except the ones mounted by containerd.
  // Ingoring the Filesystem ISSO 9660 and shared memory (device='shm')
  const nodeFilesystemAvailBytesQuery = `node_filesystem_avail_bytes{instance=~"${instanceIP}:${PORT_NODE_EXPORTER}",job=~"node-exporter",device!~'rootfs|shm', fstype!='iso9660'}`;
  const nodeFileSystemAvailBytes = queryPrometheus(
    nodeFilesystemAvailBytesQuery,
  );

  return nodeFileSystemAvailBytes;
}

export function queryNodeFSSize(instanceIP: string): Promise<Object> {
  const nodeFilesystemSizeBytesQuery = `node_filesystem_size_bytes{instance=~"${instanceIP}:${PORT_NODE_EXPORTER}",job=~"node-exporter",device!~'rootfs|shm', fstype!='iso9660'}`;
  const nodeFileSystemSizeBytes = queryPrometheus(nodeFilesystemSizeBytesQuery);

  return nodeFileSystemSizeBytes;
}
