//@flow
import React from 'react';
import { FormattedDate, FormattedTime } from 'react-intl';
import styled, { useTheme } from 'styled-components';
import { useTable } from 'react-table';
import { EmptyTable } from '@scality/core-ui';
import { padding, fontSize } from '@scality/core-ui/dist/style/theme';
import { useAlerts } from './AlertProvider';
import CircleStatus from '../components/CircleStatus';
import { TextBadge } from '../components/style/CommonLayoutStyle';
import { intl } from '../translations/IntlGlobalProvider';

const AlertPageContainer = styled.div`
  display: flex;
  flex-direction: column;
  margin: ${padding.base};
`;

const AlertPageHeaderContainer = styled.div`
  display: flex;
  align-items: center;
  background: ${(props) => props.theme.brand.backgroundLevel2};
  margin: 48px 0 ${padding.base};
  padding: ${padding.base} 0 ${padding.base} ${padding.larger};
`;

const Title = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-around;
  width: 250px;
  font-size: ${fontSize.larger};
  font-weight: bold;
  color: ${(props) => props.theme.brand.textPrimary};
`;

const SecondaryTitle = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: ${fontSize.bases};
  width: 250px;
  color: ${(props) => props.theme.brand.textSecondary};
`;

const TertiaryTitle = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-around;
  font-size: ${fontSize.base};
  width: 250px;
  color: ${(props) => props.theme.brand.textPrimary};
`;

const SeperationLine = styled.div`
  width: 250px; // the same width as the container
  height: 37px;
  border-right: 2px solid ${(props) => props.theme.brand.backgroundLevel1};
  position: absolute;
`;

function AlertLogo({
  color,
}: {
  color: 'statusHealthy' | 'statusWarning' | 'statusCritical',
}) {
  const theme = useTheme();
  return (
    <svg
      width="66"
      height="66"
      viewBox="0 0 66 66"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle
        cx="33"
        cy="33"
        r="32"
        fill={theme.brand.backgroundLevel1}
        stroke={theme.brand.infoPrimary}
      />
      <path
        d="M33 50C35.1875 50 36.9375 48.25 36.9375 46H29C29 48.25 30.75 50 33 50ZM46.4375 40.6875C45.25 39.375 42.9375 37.4375 42.9375 31C42.9375 26.1875 39.5625 22.3125 34.9375 21.3125V20C34.9375 18.9375 34.0625 18 33 18C31.875 18 31 18.9375 31 20V21.3125C26.375 22.3125 23 26.1875 23 31C23 37.4375 20.6875 39.375 19.5 40.6875C19.125 41.0625 18.9375 41.5625 19 42C19 43.0625 19.75 44 21 44H44.9375C46.1875 44 46.9375 43.0625 47 42C47 41.5625 46.8125 41.0625 46.4375 40.6875Z"
        fill={theme.brand[color]}
      />
    </svg>
  );
}

const AlertContent = styled.div`
  color: ${(props) => props.theme.brand.textPrimary};
  padding: 1rem;
  font-family: 'Lato';
  font-size: ${fontSize.base};
  background-color: ${(props) => props.theme.brand.backgroundLevel3};
  height: 100%;

  table {
    border-spacing: 0;

    tr {
      :last-child {
        td {
          border-bottom: 0;
          font-weight: normal;
          // the ending line
          border-bottom: 1px solid
            ${(props) => props.theme.brand.backgroundLevel1};
        }
      }
    }

    th {
      font-weight: bold;
      height: 56px;
      text-align: left;
      // the seperation line between table head and table content
      border-bottom: 1px solid ${(props) => props.theme.brand.backgroundLevel1};
      padding: 0.5rem;
    }
    td {
      height: 80px;
      margin: 0;
      padding: 0.5rem;
      border-bottom: 1px solid ${(props) => props.theme.brand.backgroundLevel1};
      height: 30px;
      :last-child {
        border-right: 0;
      }
    }

    .sc-emptytable {
      background-color: ${(props) => props.theme.brand.backgroundLevel3};
      > * {
        background-color: ${(props) => props.theme.brand.backgroundLevel3};
      }
    }
  }
`;

function AlertPageHeader({
  activeAlerts,
  critical,
  warning,
}: {
  activeAlerts: number,
  critical: number,
  warning: number,
}) {
  return (
    <AlertPageHeaderContainer>
      <Title>
        <AlertLogo
          color={
            critical > 0
              ? 'statusCritical'
              : warning > 0
              ? 'statusWarning'
              : 'statusHealthy'
          }
        />
        <>{intl.translate('alerts')}</>
        <SeperationLine />
      </Title>

      <SecondaryTitle>
        <>{intl.translate('active_alerts')}</>
        <TextBadge variant="infoPrimary">{`${activeAlerts}`}</TextBadge>
        <SeperationLine />
      </SecondaryTitle>

      <TertiaryTitle>
        <div>
          Critical
          <TextBadge variant="statusCritical">{`${critical}`}</TextBadge>
        </div>
        <div>
          Warning
          <TextBadge variant="statusWarning">{`${warning}`}</TextBadge>
        </div>
      </TertiaryTitle>
    </AlertPageHeaderContainer>
  );
}

const HeadRow = styled.tr`
  width: 100%;
  display: table;
  table-layout: fixed;
`;

const Body = styled.tbody`
  display: block;
  height: calc(100vh - 335px);
  overflow: auto;
`;

export default function AlertPage() {
  const alerts = useAlerts({});
  const leafAlerts =
    // $flow-disable-line
    alerts?.alerts.filter((alert) => !alert.labels.children) || [];
  console.log('leafAlerts', leafAlerts);
  const criticalAlerts = leafAlerts.filter(
    (alert) => alert.severity === 'critical',
  );
  const wariningAlerts = leafAlerts.filter(
    (alert) => alert.severity === 'warning',
  );

  const columns = React.useMemo(
    () => [
      {
        Header: 'Severity',
        accessor: 'severity',
        cellStyle: { textAlign: 'center', width: '100px' },
      },
      {
        Header: 'Name',
        accessor: 'labels.alertname',
        cellStyle: { width: '300px' },
      },
      { Header: 'Description', accessor: 'description' },
      {
        Header: 'Active since',
        accessor: 'startsAt',
        cellStyle: { width: '200px' },
      },
    ],
    [],
  );

  function ActiveAlertTab({ columns, data }) {
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
          {!data.length && (
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
                    return (
                      <td {...cellProps}>
                        <CircleStatus status={cell.value} />
                      </td>
                    );
                  } else {
                    return <td {...cellProps}>{cell.render('Cell')}</td>;
                  }
                })}
              </HeadRow>
            );
          })}
        </Body>
      </table>
    );
  }

  return (
    <AlertPageContainer>
      <AlertPageHeader
        activeAlerts={leafAlerts.length}
        critical={criticalAlerts.length}
        warning={wariningAlerts.length}
      />
      <AlertContent>
        <ActiveAlertTab data={leafAlerts} columns={columns} />
      </AlertContent>
    </AlertPageContainer>
  );
}
