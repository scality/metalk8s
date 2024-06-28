import { useCallback } from 'react';
import { useQuery } from 'react-query';
import { useTheme } from 'styled-components';

import { ProgressBar, spacing } from '@scality/core-ui';

import { Table } from '@scality/core-ui/dist/next';
import {
  NODE_FILESYSTEM_ALMOST_OUTOF_FILES,
  NODE_FILESYSTEM_ALMOST_OUTOF_SPACE,
  NODE_FILESYSTEM_FILES_FILLINGUP,
  NODE_FILESYSTEM_SPACE_FILLINGUP,
  PORT_NODE_EXPORTER,
} from '../constants';
import { useAlerts } from '../containers/AlertProvider';
import { getNodePartitionsTableData } from '../services/NodeVolumesUtils';
import {
  queryNodeFSSize,
  queryNodeFSUsage,
} from '../services/prometheus/fetchMetrics';
import CircleStatus from './CircleStatus';

const NodePartitionTable = ({ instanceIP }: { instanceIP: string }) => {
  const theme = useTheme();
  const columns = [
    {
      Header: 'Health',
      accessor: 'health',
      cellStyle: {
        textAlign: 'center',
        width: '6.25rem',
      },
      Cell: ({ value }) => {
        return <CircleStatus status={value} />;
      },
    },
    {
      Header: 'Partition path',
      accessor: 'partitionPath',
      cellStyle: {
        textAlign: 'left',
        flex: 1,
      },
    },
    {
      Header: 'Usage',
      accessor: 'usage',
      cellStyle: {
        textAlign: 'center',
        flex: 1,
      },
      Cell: ({ value }) => {
        return (
          <ProgressBar
            size="large"
            color={theme.infoSecondary}
            percentage={value}
            buildinLabel={`${value}%`}
            backgroundColor={theme.buttonSecondary}
            aria-label={`${value}%`}
          />
        );
      },
    },
    {
      Header: 'Size',
      accessor: 'size',
      cellStyle: {
        textAlign: 'right',
        width: '6.25rem',
        marginRight: spacing.r16,
      },
    },
  ];
  const alertList = useAlerts({
    alertname: [
      NODE_FILESYSTEM_SPACE_FILLINGUP,
      NODE_FILESYSTEM_ALMOST_OUTOF_SPACE,
      NODE_FILESYSTEM_FILES_FILLINGUP,
      NODE_FILESYSTEM_ALMOST_OUTOF_FILES,
    ],
    instance: `${instanceIP}:${PORT_NODE_EXPORTER}`,
  });
  const alertNF = alertList && alertList.alerts;
  const { data: nodeFSResult, status } = useQuery(
    ['nodeDevices', instanceIP],
    useCallback(
      () =>
        Promise.all([
          queryNodeFSUsage(instanceIP),
          queryNodeFSSize(instanceIP),
        ]).then(([nodeFSUsageResult, nodeFSSizeResult]) => {
          if (
            nodeFSUsageResult.status === 'success' &&
            nodeFSSizeResult.status === 'success' &&
            nodeFSUsageResult.data.resultType === 'vector' &&
            nodeFSSizeResult.data.resultType === 'vector'
          ) {
            return {
              nodeFSUsage: nodeFSUsageResult.data.result,
              nodeFSSize: nodeFSSizeResult.data.result,
            };
          }
        }),
      [instanceIP],
    ),
  );
  let partitions = [];
  if (status === 'success')
    partitions = getNodePartitionsTableData(
      nodeFSResult.nodeFSUsage,
      nodeFSResult.nodeFSSize,
      alertNF,
    );
  return (
    <Table
      status={status}
      columns={columns}
      data={partitions}
      defaultSortingKey={'health'}
      entityName={{
        en: {
          singular: 'system partition',
          plural: 'system partitions',
        },
      }}
    >
      <Table.SingleSelectableContent
        rowHeight="h40"
        separationLineVariant="backgroundLevel2"
      />
    </Table>
  );
};

export default NodePartitionTable;
