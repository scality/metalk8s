//@flow
import React, { useCallback } from 'react';
import styled, { useTheme } from 'styled-components';
import { useTable } from 'react-table';
import { useQuery } from 'react-query';
import { ProgressBar, Loader, EmptyTable } from '@scality/core-ui';
import { fontSize, padding } from '@scality/core-ui/dist/style/theme';
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
import { useIntl } from 'react-intl';

const HeadRow = styled.tr`
  width: 100%;
  /* To display scroll bar on the table */
  display: table;
  table-layout: fixed;
`;

const Body = styled.tbody`
  /* To display scroll bar on the table */
  display: block;
  overflow: auto;
`;

const SystemDeviceTableContainer = styled.div`
  color: ${(props) => props.theme.textPrimary};
  padding: 1rem;
  font-family: 'Lato';
  font-size: ${fontSize.base};
  table {
    border-spacing: 0;

    th {
      font-weight: bold;
      height: 56px;
      border-bottom: 1px solid ${(props) => props.theme.backgroundLevel1};
    }

    td {
      margin: 0;
      padding: 0.5rem;
      text-align: left;
      padding: 5px;
      height: 48px;
      border-bottom: 1px solid ${(props) => props.theme.backgroundLevel1};
      :last-child {
        border-right: 0;
      }
    }
  }
`;

const Cell = styled.td`
  overflow-wrap: break-word;
`;

const columns = [
  {
    Header: 'Health',
    accessor: 'health',
    cellStyle: { textAlign: 'center', width: '100px' },
    Cell: (cellProps) => {
      return (
        <CircleStatus className="fas fa-circle" status={cellProps.value} />
      );
    },
  },
  {
    Header: 'Partition path',
    accessor: 'partitionPath',
    cellStyle: { textAlign: 'left' },
  },
  {
    Header: 'Usage',
    accessor: 'usage',
    cellStyle: { textAlign: 'center' },
  },
  {
    Header: 'Size',
    accessor: 'size',
    cellStyle: { textAlign: 'right', width: '100px' },
  },
];

const LoaderContainer = styled.div`
  display: flex;
  justify-content: center;
`;

const NodePartitionTable = ({ instanceIP }: { instanceIP: string }) => {
  const theme = useTheme();
  const intl = useIntl();
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

  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    rows,
    prepareRow,
  } = useTable({
    columns,
    data: partitions || [],
  });

  return (
    <SystemDeviceTableContainer>
      <table {...getTableProps()}>
        <thead>
          {headerGroups.map((headerGroup) => {
            return (
              <HeadRow {...headerGroup.getHeaderGroupProps()}>
                {headerGroup.headers.map((column) => {
                  const headerStyleProps = column.getHeaderProps({
                    style: column.cellStyle,
                  });
                  return (
                    <th {...headerStyleProps}>{column.render('Header')}</th>
                  );
                })}
              </HeadRow>
            );
          })}
        </thead>
        <Body {...getTableBodyProps()}>
          {status === 'success' && partitions.length === 0 && (
            <EmptyTable>
              {intl.formatMessage({ id: 'no_system_partition' })}
            </EmptyTable>
          )}
          {status === 'loading' && (
            <HeadRow
              style={{
                width: '100%',
                paddingTop: padding.base,
                height: '60px',
              }}
            >
              <td
                style={{
                  width: '100%',
                  textAlign: 'center',
                }}
              >
                <LoaderContainer>
                  <Loader size="large" aria-label="loading" />
                </LoaderContainer>
              </td>
            </HeadRow>
          )}
          {status === 'error' && (
            <HeadRow
              style={{
                width: '100%',
                paddingTop: padding.base,
                height: '60px',
              }}
            >
              <td
                style={{
                  width: '100%',
                  textAlign: 'center',
                }}
              >
                {intl.formatMessage({ id: 'error_system_partitions' })}
              </td>
            </HeadRow>
          )}
          {rows.map((row, i) => {
            prepareRow(row);
            return (
              <HeadRow {...row.getRowProps()}>
                {row.cells.map((cell) => {
                  let cellProps = cell.getCellProps({
                    style: { ...cell.column.cellStyle },
                  });
                  if (cell.column.Header === 'Usage') {
                    return (
                      <Cell {...cellProps}>
                        <ProgressBar
                          size="large"
                          color={theme.infoSecondary}
                          percentage={cell.value}
                          buildinLabel={`${cell.value}%`}
                          backgroundColor={theme.buttonSecondary}
                          aria-label={`${cell.value}%`}
                        />
                      </Cell>
                    );
                  }
                  return <Cell {...cellProps}>{cell.render('Cell')}</Cell>;
                })}
              </HeadRow>
            );
          })}
        </Body>
      </table>
    </SystemDeviceTableContainer>
  );
};

export default NodePartitionTable;
