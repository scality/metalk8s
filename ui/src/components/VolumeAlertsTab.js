import React from 'react';
import { useLocation } from 'react-router';
import styled from 'styled-components';
import {
  fontSize,
  padding,
  fontWeight,
} from '@scality/core-ui/dist/style/theme';
import ActiveAlertsFilters from './ActiveAlertsFilters';
import { Chips, EmptyTable } from '@scality/core-ui';
import { useTable } from 'react-table';
import { intl } from '../translations/IntlGlobalProvider';
import { VolumeTab } from './style/CommonLayoutStyle';
import { formatDateToMid1 } from '../services/utils';

// Overriding overflow for the Tab since the table components has inner scroll
const VolumeAlertTab = styled(VolumeTab)`
  overflow: hidden;
`;

const ActiveAlertsCardContainer = styled.div`
  margin: ${padding.small};
  padding: ${padding.small};
`;

const ActiveAlertsTitle = styled.div`
  color: ${(props) => props.theme.textPrimary};
  font-size: ${fontSize.large};
  font-weight: ${fontWeight.bold};
  padding: ${padding.small} 0 0 0;
  display: flex;
  justify-content: space-between;
`;

const ActiveAlertsTableContainer = styled.div`
  color: ${(props) => props.theme.textPrimary};
  padding: 1rem;
  font-family: 'Lato';
  font-size: ${fontSize.base};

  table {
    border-spacing: 0;

    tr {
      :last-child {
        td {
          border-bottom: 0;
          font-weight: normal;
        }
      }
    }

    th {
      font-weight: bold;
      height: 56px;
      text-align: left;
      padding: 0.5rem;
    }

    td {
      height: 80px;
      margin: 0;
      padding: 0.5rem;
      border-bottom: 1px solid black;
      height: 30px;
      :last-child {
        border-right: 0;
      }
    }

    .sc-emptytable {
      background-color: ${(props) => props.theme.backgroundLevel4};
      > * {
        background-color: ${(props) => props.theme.backgroundLevel4};
      }
    }
  }
`;

const HeadRow = styled.tr`
  width: 100%;
  /* To display scroll bar on the table */
  display: table;
  table-layout: fixed;
`;

// * table body
const Body = styled.tbody`
  /* To display scroll bar on the table */
  display: block;
  height: calc(100vh - 250px);
  overflow: auto;
  overflow-y: auto;
`;

const ActiveAlertsCard = (props) => {
  const { alertlist, PVCName } = props;
  const location = useLocation();

  const query = new URLSearchParams(location.search);
  const selectedFilter = query.get('severity');

  let activeAlertListData =
    alertlist?.map((alert) => {
      return {
        name: alert.labels.alertname,
        severity: alert.labels.severity,
        alert_description: alert.description || alert.summary,
        active_since: alert.startsAt,
      };
    }) ?? [];

  if (activeAlertListData && selectedFilter)
    activeAlertListData = activeAlertListData.filter(
      (item) => item.severity === selectedFilter,
    );

  // React Table for the volume list
  function Table({ columns, data }) {
    // Use the state and functions returned from useTable to build your UI
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

    // Render the UI for your table
    return (
      <table {...getTableProps()}>
        <thead>
          {headerGroups.map((headerGroup) => (
            <HeadRow {...headerGroup.getHeaderGroupProps()}>
              {headerGroup.headers.map((column) => {
                const headerStyleProps = column.getHeaderProps({
                  style: column.cellStyle,
                });
                return <th {...headerStyleProps}>{column.render('Header')}</th>;
              })}
            </HeadRow>
          ))}
        </thead>

        <Body {...getTableBodyProps()}>
          {!PVCName && (
            <EmptyTable> {intl.translate('volume_is_not_bound')}</EmptyTable>
          )}
          {PVCName && data?.length === 0 && (
            <EmptyTable>{intl.translate('no_active_alerts')}</EmptyTable>
          )}
          {rows?.map((row, i) => {
            prepareRow(row);
            return (
              <HeadRow {...row.getRowProps()}>
                {row.cells.map((cell) => {
                  let cellProps = cell.getCellProps({
                    style: {
                      ...cell.column.cellStyle,
                    },
                  });
                  if (cell.column.Header === 'Active since') {
                    return (
                      <td {...cellProps}>
                        <span>{formatDateToMid1(cell.value)}</span>
                      </td>
                    );
                  } else if (cell.column.Header === 'Severity') {
                    if (cell.value === 'warning') {
                      return (
                        <td {...cellProps}>
                          <Chips text={cell.render('Cell')} variant="warning" />
                        </td>
                      );
                    } else if (cell.value === 'critical') {
                      return (
                        <td {...cellProps}>
                          <Chips
                            text={cell.render('Cell')}
                            variant="critical"
                          />
                        </td>
                      );
                    }
                  } else {
                    return <td {...cellProps}>{cell.render('Cell')}</td>;
                  }
                  return null;
                })}
              </HeadRow>
            );
          })}
        </Body>
      </table>
    );
  }
  // columns for alert table
  const columns = React.useMemo(
    () => [
      {
        Header: 'Name',
        accessor: 'name',
        cellStyle: {
          paddingRight: '5px',
          wordBreak: 'break-all',
        },
      },
      {
        Header: 'Severity',
        accessor: 'severity',
        cellStyle: { textAlign: 'center', width: '100px' },
      },
      { Header: 'Description', accessor: 'alert_description' },
      {
        Header: 'Active since',
        accessor: 'active_since',
        cellStyle: { textAlign: 'center', width: '120px' },
      },
    ],
    [],
  );

  return (
    <VolumeAlertTab>
      <ActiveAlertsCardContainer>
        <ActiveAlertsTitle>
          <div>{intl.translate('active_alerts')}</div>
          {PVCName && activeAlertListData?.length !== 0 && (
            <ActiveAlertsFilters />
          )}
        </ActiveAlertsTitle>

        <ActiveAlertsTableContainer>
          <Table columns={columns} data={activeAlertListData} />
        </ActiveAlertsTableContainer>
      </ActiveAlertsCardContainer>
    </VolumeAlertTab>
  );
};

export default ActiveAlertsCard;
