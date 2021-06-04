import React from 'react';
import styled from 'styled-components';
import { Chips, EmptyTable } from '@scality/core-ui';
import {
  fontSize,
  padding,
  fontWeight,
} from '@scality/core-ui/dist/style/theme';
import { useTable } from 'react-table';
import ActiveAlertsFilter from './ActiveAlertsFilters';
import { useURLQuery, formatDateToMid1 } from '../services/utils';
import { NodeTab } from './style/CommonLayoutStyle';
import { STATUS_WARNING, STATUS_CRITICAL } from '../constants';
import { intl } from '../translations/IntlGlobalProvider';

// Overriding overflow for the Tab since the table components has inner scroll
const NodeAlertsTab = styled(NodeTab)`
  overflow: hidden;
`;

const ActiveAlertsTableContainer = styled.div`
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
      border-bottom: 1px solid ${(props) => props.theme.backgroundLevel1};
      text-align: left;
      padding: 5px;

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

const Body = styled.tbody`
  /* To display scroll bar on the table */
  display: block;
  height: calc(100vh - 250px);
  overflow: auto;
  overflow-y: auto;
`;

const ActiveAlertsText = styled.div`
  color: ${(props) => props.theme.textPrimary};
  font-weight: ${fontWeight.bold};
  font-size: ${fontSize.large};
`;

const TitleContainer = styled.div`
  display: flex;
  justify-content: space-between;
  padding: ${padding.large} ${padding.base} 0 ${padding.base};
`;

const NodePageAlertsTab = (props) => {
  const { alertsNode } = props;
  const query = useURLQuery();
  // Retrieve the severity filter from URL.
  // Filter more than one severity, the URL should be:
  // `/nodes/<node-name>/alerts?severity=warning&severity=critical`
  let alertSeverity = query.getAll('severity');
  // Display all the alerts when there is no severity filter
  if (alertSeverity?.length === 0) {
    alertSeverity.push(STATUS_WARNING, STATUS_CRITICAL);
  }

  const activeAlertListData =
    alertsNode
      ?.map((alert) => {
        return {
          name: alert.labels.alertname,
          severity: alert.labels.severity,
          alertDescription: alert.description || alert.summary,
          activeSince: alert.startsAt,
        };
      })
      ?.filter((alert) => alertSeverity.includes(alert.severity)) ?? [];

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
          {activeAlertListData.length === 0 ? (
            <EmptyTable>{intl.translate('no_active_alerts')}</EmptyTable>
          ) : null}
          {rows.map((row, i) => {
            prepareRow(row);
            return (
              <HeadRow {...row.getRowProps()}>
                {row.cells.map((cell) => {
                  let cellProps = cell.getCellProps({
                    style: { ...cell.column.cellStyle },
                  });
                  if (cell.column.Header === 'Active since') {
                    return (
                      <td {...cellProps}>
                        <span>{formatDateToMid1(cell.value)}</span>
                      </td>
                    );
                  } else if (cell.column.Header === 'Severity') {
                    if (cell.value === STATUS_WARNING) {
                      return (
                        <td {...cellProps}>
                          <Chips
                            text={cell.render('Cell')}
                            variant={'statusWarning'}
                          />
                        </td>
                      );
                    } else if (cell.value === STATUS_CRITICAL) {
                      return (
                        <td {...cellProps}>
                          <Chips
                            text={cell.render('Cell')}
                            variant={'statusCritical'}
                          />
                        </td>
                      );
                    }
                  }
                  return <td {...cellProps}>{cell.render('Cell')}</td>;
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
      { Header: 'Description', accessor: 'alertDescription' },
      {
        Header: 'Active since',
        accessor: 'activeSince',
        cellStyle: { textAlign: 'center', width: '120px' },
      },
    ],
    [],
  );

  return (
    <NodeAlertsTab>
      <TitleContainer>
        <ActiveAlertsText>
          {intl.translate('active_alerts')}
        </ActiveAlertsText>
        <ActiveAlertsFilter />
      </TitleContainer>
      <ActiveAlertsTableContainer>
        <Table columns={columns} data={activeAlertListData} />
      </ActiveAlertsTableContainer>
    </NodeAlertsTab>
  );
};

export default NodePageAlertsTab;
