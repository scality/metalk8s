//@flow
import React, { useCallback, useContext } from 'react';
import styled, { ThemeContext } from 'styled-components';
import { useTable } from 'react-table';
import { useQuery } from 'react-query';
import { ProgressBar } from '@scality/core-ui';
import { fontSize, padding } from '@scality/core-ui/dist/style/theme';
import {
  queryNodeFSAvail,
  queryNodeFSSize,
} from '../services/prometheus/fetchMetrics';
import CircleStatus from './CircleStatus';
import { getAlerts } from '../services/alertmanager/api';
import { getNodePartitionsTableData } from '../services/NodeVolumesUtils';
import { intl } from '../translations/IntlGlobalProvider';

const HeadRow = styled.tr`
  width: 100%;
  /* To display scroll bar on the table */
  display: table;
  table-layout: fixed;
`;

const Body = styled.tbody`
  /* To display scroll bar on the table */
  display: block;
  height: calc(100vh - 250px);
  overflow: auto;
`;

const SystemDeviceTableContainer = styled.div`
  color: ${(props) => props.theme.brand.textPrimary};
  padding: 1rem;
  font-family: 'Lato';
  font-size: ${fontSize.base};
  border-color: ${(props) => props.theme.brand.borderLight};
  table {
    border-spacing: 0;

    th {
      font-weight: bold;
      height: 56px;
      border-bottom: 1px solid ${(props) => props.theme.brand.border};
    }

    td {
      margin: 0;
      padding: 0.5rem;
      text-align: left;
      padding: 5px;
      height: 48px;
      border-bottom: 1px solid ${(props) => props.theme.brand.border};
      :last-child {
        border-right: 0;
      }
    }
    .sc-progressbarcontainer > div {
      background-color: ${(props) => props.theme.brand.secondaryDark1};
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
    cellStyle: { textAlign: 'center', width: '180px' },
  },
  {
    Header: 'Size',
    accessor: 'size',
    cellStyle: { textAlign: 'right', width: '100px' },
  },
];

const NodePartitionTable = ({ instanceIP }: { instanceIP: string }) => {
  // Access the current theme outside of styled components when working with React Hooks.
  const themeContext = useContext(ThemeContext);

  // The following queries will execute in parallel
  const nodeFSAvailQuery = useQuery(
    ['nodeFSAvail', instanceIP],
    useCallback(() => queryNodeFSAvail(instanceIP), [instanceIP]),
  );

  const nodeFSSizeQuery = useQuery(
    ['nodeFSSize', instanceIP],
    useCallback(() => queryNodeFSSize(instanceIP), [instanceIP]),
  );
  const alertsNodeFS = useQuery(['alertsNodeFS', instanceIP], getAlerts);

  let data = [];
  if (
    nodeFSAvailQuery.isSuccess &&
    nodeFSSizeQuery.isSuccess &&
    alertsNodeFS.isSuccess
  ) {
    data = getNodePartitionsTableData(
      nodeFSAvailQuery.data.data.result,
      nodeFSSizeQuery.data.data.result,
      alertsNodeFS.data,
    );
  }

  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    rows,
    prepareRow,
  } = useTable({
    columns,
    data,
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
          {data.length === 0 && (
            <HeadRow
              style={{
                width: '100%',
                paddingTop: padding.base,
                height: '60px',
              }}
            >
              <td
                style={{
                  textAlign: 'center',
                }}
              >
                {intl.translate('no_system_partition')}
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
                          percentage={cell.value}
                          buildinLabel={`${cell.value}%`}
                          backgroundColor={themeContext.brand.primaryDark1}
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
