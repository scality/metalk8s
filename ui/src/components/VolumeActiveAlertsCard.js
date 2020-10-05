import React from 'react';
import { FormattedDate, FormattedTime } from 'react-intl';
import styled from 'styled-components';
import {
  fontSize,
  padding,
  fontWeight,
} from '@scality/core-ui/dist/style/theme';
import { Chips } from '@scality/core-ui';
import { useTable } from 'react-table';
import { intl } from '../translations/IntlGlobalProvider';

const ActiveAlertsCardContainer = styled.div`
  min-height: 75px;
  background-color: ${(props) => props.theme.brand.primaryDark1};
  margin: ${padding.small};
  padding: 0 ${padding.large} ${padding.small} 0;
`;

const ActiveAlertsTitle = styled.div`
  color: ${(props) => props.theme.brand.textPrimary};
  font-size: ${fontSize.base};
  font-weight: ${fontWeight.bold};
  padding: ${padding.small} 0 0 ${padding.large};
`;

const ActiveAlertsTableContainer = styled.div`
  color: ${(props) => props.theme.brand.textPrimary};
  padding: 1rem;
  font-family: 'Lato';
  font-size: ${fontSize.base};
  border-color: ${(props) => props.theme.brand.borderLight};
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
  }
`;

const NoActiveAlerts = styled.div`
  color: ${(props) => props.theme.brand.textPrimary};
  font-size: ${fontSize.base};
  padding: ${padding.small} 0 0 ${padding.larger};
`;

const ActiveAlertsCard = (props) => {
  const { alertlist, PVCName } = props;

  const activeAlertListData = alertlist?.map((alert) => {
    return {
      name: alert.labels.alertname,
      severity: alert.labels.severity,
      alert_description: alert.annotations.message,
      active_since: alert.startsAt,
    };
  });
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
            <tr {...headerGroup.getHeaderGroupProps()}>
              {headerGroup.headers.map((column) => (
                <th {...column.getHeaderProps()}>{column.render('Header')}</th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody {...getTableBodyProps()}>
          {rows.map((row, i) => {
            prepareRow(row);
            return (
              <tr {...row.getRowProps()}>
                {row.cells.map((cell) => {
                  if (cell.column.Header === 'Active since') {
                    return (
                      <td {...cell.getCellProps()}>
                        <span>
                          <FormattedDate value={cell.value} />{' '}
                          <FormattedTime
                            hour="2-digit"
                            minute="2-digit"
                            second="2-digit"
                            value={cell.value}
                          />
                        </span>
                      </td>
                    );
                  } else if (cell.column.Header === 'Severity') {
                    if (cell.value === 'warning') {
                      return (
                        <td {...cell.getCellProps()}>
                          <Chips text={cell.render('Cell')} variant="warning" />
                        </td>
                      );
                    } else if (cell.value === 'critical') {
                      return (
                        <td {...cell.getCellProps()}>
                          <Chips
                            text={cell.render('Cell')}
                            variant="critical"
                          />
                        </td>
                      );
                    }
                  } else {
                    return (
                      <td {...cell.getCellProps()}>{cell.render('Cell')}</td>
                    );
                  }
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    );
  }
  // columns for alert table
  const columns = React.useMemo(
    () => [
      { Header: 'Name', accessor: 'name' },
      { Header: 'Severity', accessor: 'severity' },
      { Header: 'Description', accessor: 'alert_description' },
      { Header: 'Active since', accessor: 'active_since' },
    ],
    [],
  );

  return (
    <ActiveAlertsCardContainer>
      <ActiveAlertsTitle>{intl.translate('active_alerts')}</ActiveAlertsTitle>
      {PVCName && alertlist.length !== 0 ? (
        <ActiveAlertsTableContainer>
          <Table columns={columns} data={activeAlertListData} />
        </ActiveAlertsTableContainer>
      ) : (
        <NoActiveAlerts>{intl.translate('no_active_alerts')}</NoActiveAlerts>
      )}
    </ActiveAlertsCardContainer>
  );
};

export default ActiveAlertsCard;
