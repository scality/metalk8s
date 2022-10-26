import React, { useMemo } from 'react';
import styled from 'styled-components';
import { StatusWrapper, ConstrainedText, TextBadge } from '@scality/core-ui';
import { Table } from '@scality/core-ui/dist/next';
import { padding, fontSize, spacing } from '@scality/core-ui/dist/style/theme';
import { useAlerts } from './AlertProvider';
import StatusIcon from '../components/StatusIcon';
import { STATUS_WARNING, STATUS_CRITICAL, STATUS_HEALTH } from '../constants';
import { compareHealth, formatDateToMid1 } from '../services/utils';
import CircleStatus from '../components/CircleStatus';
import { useIntl } from 'react-intl';
import isEqual from 'lodash.isequal';
const AlertPageContainer = styled.div`
  display: flex;
  flex-direction: column;
  margin: ${padding.base};
  background-color: ${(props) => props.theme.backgroundLevel1};
  height: 100%;
  width: 100%;
`;
const AlertPageHeaderContainer = styled.div`
  display: flex;
  align-items: center;
  background: ${(props) => props.theme.backgroundLevel2};
  margin: 36px 0 ${padding.small};
  padding: ${padding.base} 0 ${padding.base} ${padding.larger};
`;
const Title = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-around;
  width: 250px;
  font-size: ${fontSize.larger};
  font-weight: bold;
  color: ${(props) => props.theme.textPrimary};
`;
const SecondaryTitle = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: ${fontSize.bases};
  width: 250px;
  color: ${(props) => props.theme.textSecondary};
`;
const TertiaryTitle = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-around;
  font-size: ${fontSize.base};
  width: 250px;
  color: ${(props) => props.theme.textPrimary};
`;
const SeperationLine = styled.div`
  width: 250px; // the same width as the container
  height: 37px;
  border-right: 2px solid ${(props) => props.theme.backgroundLevel1};
  position: absolute;
`;
const AlertStatusIcon = styled.div`
  font-size: 2rem;
  border: 1px solid ${(props) => props.theme.infoPrimary};
  border-radius: 50%;
  background: ${(props) => props.theme.backgroundLevel1};
  padding: 0.7rem 0.5rem 0.3rem;
  width: 3rem;
  height: 3rem;
  text-align: center;

  & > span {
    margin: 0;
  }
`;

// only compare the id and severity since the rest of the data can change often (like updateAt, description that display time)
// and we don't want to re-render the whole table every time
const isEqualAlert = (a = [], b = []) => {
  if (a.length !== b.length) {
    return false;
  }

  return a.every((alertData) =>
    b.find(
      (alert) =>
        alert.id === alertData.id && alert.severity === alertData.severity,
    ),
  );
};

const getAlertStatus = (numbersOfCritical, numbersOfWarning) =>
  numbersOfCritical > 0
    ? STATUS_CRITICAL
    : numbersOfWarning > 0
    ? STATUS_WARNING
    : STATUS_HEALTH;

function AlertPageHeader({
  activeAlerts,
  critical,
  warning,
}: {
  activeAlerts: number;
  critical: number;
  warning: number;
}) {
  const intl = useIntl();
  const alertStatus = getAlertStatus(critical, warning);
  return (
    <AlertPageHeaderContainer>
      <Title>
        <AlertStatusIcon>
          <StatusWrapper status={alertStatus}>
            <StatusIcon status={alertStatus} name="Alert" />
          </StatusWrapper>
        </AlertStatusIcon>
        <>
          {intl.formatMessage({
            id: 'alerts',
          })}
        </>
        <SeperationLine />
      </Title>

      <SecondaryTitle>
        <>
          {intl.formatMessage({
            id: 'active_alerts',
          })}
        </>
        <TextBadge variant="infoPrimary" text={activeAlerts} />
        <SeperationLine />
      </SecondaryTitle>

      <TertiaryTitle>
        <div>
          Critical
          <TextBadge variant="statusCritical" text={critical} />
        </div>
        <div>
          Warning
          <TextBadge variant="statusWarning" text={warning} />
        </div>
      </TertiaryTitle>
    </AlertPageHeaderContainer>
  );
}

export const SortCaretWrapper = styled.span`
  padding-left: ${padding.smaller};
  position: absolute;
`;
export const SortIncentive = styled.span`
  position: absolute;
  display: none;
`;
export const TableHeader = styled.th`
  &:hover {
    ${SortIncentive} {
      display: block;
    }
  }
`;
const AlertContent = styled.div`
  color: ${(props) => props.theme.textPrimary};
  padding: 1rem;
  font-family: 'Lato';
  font-size: ${fontSize.base};
  background-color: ${(props) => props.theme.backgroundLevel3};
  display: flex;
  width: 100%;
  height: 100%;

  .table {
    width: calc(100% - 2rem);
  }
`;
const ActiveAlertTab = React.memo(
  ({ columns, data }) => {
    const sortTypes = React.useMemo(() => {
      return {
        severity: (row1, row2) => {
          return compareHealth(row2?.values?.severity, row1?.values?.severity);
        },
        name: (row1, row2) => {
          const a = row1?.values['labels.alertname'];
          const b = row2.values['labels.alertname'];
          return a.toLowerCase().localeCompare(b.toLowerCase());
        },
        description: (row1, row2) => {
          const a = row1?.values?.description;
          const b = row2.values?.description;
          return a.toLowerCase().localeCompare(b.toLowerCase());
        },
        startsAt: (row1, row2) => {
          const a = row1?.values?.startsAt;
          const b = row2.values?.startsAt;
          return new Date(a) - new Date(b);
        },
      };
    }, []);
    const DEFAULT_SORTING_KEY = 'severity';
    return (
      <Table
        columns={columns}
        data={data}
        defaultSortingKey={DEFAULT_SORTING_KEY}
        sortTypes={sortTypes}
      >
        <div
          style={{
            margin: `${spacing.sp16} 0`,
          }}
        >
          <Table.SearchWithQueryParams
            displayedName={{
              singular: 'alert',
              plural: 'alerts',
            }}
          />
        </div>
        <Table.SingleSelectableContent
          rowHeight="h48"
          separationLineVariant="backgroundLevel1"
          backgroundVariant="backgroundLevel2"
          customItemKey={(index, data) => {
            return data[index].id;
          }}
        />
      </Table>
    );
  },
  (a, b) => {
    // compare the alert only on id and severity
    return isEqual(a.columns, b.columns) && isEqualAlert(a.data, b.data);
  },
);
export default function AlertPage() {
  const alerts = useAlerts({});
  const leafAlerts = useMemo(
    () => alerts?.alerts.filter((alert) => !alert.labels.children) || [],
    [JSON.stringify(alerts?.alerts)],
  );
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
        cellStyle: {
          textAlign: 'center',
          width: '100px',
        },
        sortType: 'severity',
        Cell: (cell) => <CircleStatus status={cell.value} />,
      },
      {
        Header: 'Name',
        accessor: 'labels.alertname',
        cellStyle: {
          flexGrow: '2',
        },
        sortType: 'name',
      },
      {
        Header: 'Description',
        cellStyle: {
          flexGrow: '12',
          margin: `0 ${spacing.sp8}`,
        },
        accessor: (row) => row.description || row.summary,
        Cell: (cell) => <ConstrainedText lineClamp={2} text={cell.value} />,
      },
      {
        Header: 'Active since',
        accessor: 'startsAt',
        cellStyle: {
          flexGrow: '1',
          textAlign: 'right',
          marginRight: spacing.sp8,
        },
        Cell: (cell) => <span>{formatDateToMid1(cell.value)}</span>,
      },
    ],
    [],
  );
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