//@flow
import React, { useCallback } from 'react';
import { useTheme } from 'styled-components';
import { useQuery } from 'react-query';
import { useIntl } from 'react-intl';
import { Loader, ProgressBar } from '@scality/core-ui';
import { NoResult } from '@scality/core-ui/dist/components/tablev2/Tablestyle';
import { Box, Table } from '@scality/core-ui/dist/next';
import {
  queryNodeFSUsage,
  queryNodeFSSize,
} from '../services/prometheus/fetchMetrics';
import CircleStatus from './CircleStatus';
import { getNodePartitionsTableData } from '../services/NodeVolumesUtils';
import { useAlerts } from '../containers/AlertProvider';
import {
  NODE_FILESYSTEM_SPACE_FILLINGUP,
  NODE_FILESYSTEM_ALMOST_OUTOF_SPACE,
  NODE_FILESYSTEM_FILES_FILLINGUP,
  NODE_FILESYSTEM_ALMOST_OUTOF_FILES,
  PORT_NODE_EXPORTER,
} from '../constants';

const NodePartitionTable = ({ instanceIP }: { instanceIP: string }) => {
  const theme = useTheme();
  const intl = useIntl();
  const columns = [
    {
      Header: 'Health',
      accessor: 'health',
      cellStyle: { textAlign: 'center', width: '6.25rem' },
      Cell: ({ value }) => {
        return <CircleStatus className="fas fa-circle" status={value} />;
      },
    },
    {
      Header: 'Partition path',
      accessor: 'partitionPath',
      cellStyle: { textAlign: 'left', flex: 1 },
    },
    {
      Header: 'Usage',
      accessor: 'usage',
      cellStyle: { textAlign: 'center', flex: 1 },
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
      cellStyle: { textAlign: 'right', width: '6.25rem' },
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
    <Box flex={1} pr="1rem">
      <Table columns={columns} data={partitions} defaultSortingKey={'health'}>
        <Table.SingleSelectableContent
          rowHeight="h40"
          separationLineVariant="backgroundLevel2"
          backgroundVariant="backgroundLevel4"
          children={(Rows) => {
            if (status === 'loading') {
              return (
                <Box display="flex" justifyContent="center">
                  <Loader size="large" aria-label="loading" />
                </Box>
              );
            } else if (status === 'error') {
              return (
                <> {intl.formatMessage({ id: 'error_system_partitions' })}</>
              );
            } else if (status === 'success' && partitions.length === 0) {
              return (
                <NoResult>
                  {intl.formatMessage({ id: 'no_system_partition' })}
                </NoResult>
              );
            }
            return <>{Rows}</>;
          }}
        />
      </Table>
    </Box>
  );
};

export default NodePartitionTable;
