import {
  AppContainer,
  ConstrainedText,
  FormattedDateTime,
  Stack,
  StatusWrapper,
  TextBadge,
  Wrap,
  spacing,
} from '@scality/core-ui';
import { Button, Table } from '@scality/core-ui/dist/next';
import { fontSize } from '@scality/core-ui/dist/style/theme';
import isEqual from 'lodash.isequal';
import React, { useMemo } from 'react';
import { useIntl } from 'react-intl';
import styled from 'styled-components';
import CircleStatus from '../components/CircleStatus';
import StatusIcon from '../components/StatusIcon';
import { STATUS_CRITICAL, STATUS_HEALTH, STATUS_WARNING } from '../constants';
import { useUserAccessRight } from '../hooks';
import { compareHealth } from '../services/utils';
import { useAlerts } from './AlertProvider';
import type { Alert } from '../services/alertUtils';
import type { QueryStatus } from 'react-query';
import { useBasenameRelativeNavigate } from '@scality/module-federation';

const AlertPageHeaderContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  /* The three summary segments and the button together need more room than a
     768px content box has, so let the button drop to its own line instead of
     pushing the page into horizontal scroll. */
  flex-wrap: wrap;
  gap: ${spacing.r8};
  background: ${(props) => props.theme.backgroundLevel2};
`;

/* The three segments were each pinned at 250px -- 750px of the header before the
   button. They divide the available width equally instead, and draw their own
   divider: the previous SeperationLine was a 250px absolutely-positioned box
   whose right border happened to land at the segment's edge, which only worked
   while the segment was exactly that wide. */
const HeaderSegment = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  flex: 1 1 0;
  min-width: 0;
  color: ${(props) => props.theme.textPrimary};

  &:not(:last-child)::after {
    content: '';
    position: absolute;
    right: 0;
    top: 50%;
    transform: translateY(-50%);
    height: 37px;
    border-right: 2px solid ${(props) => props.theme.backgroundLevel1};
  }
`;

const Title = styled(HeaderSegment)`
  justify-content: space-around;
  font-size: ${fontSize.larger};
  font-weight: bold;
`;
const SecondaryTitle = styled(HeaderSegment)`
  justify-content: center;
  font-size: ${fontSize.base};
`;
const TertiaryTitle = styled(HeaderSegment)`
  justify-content: space-around;
  font-size: ${fontSize.base};
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

  return a.every((alertData) => b.find((alert) => alert.id === alertData.id && alert.severity === alertData.severity));
};

const getAlertStatus = (numbersOfCritical, numbersOfWarning) =>
  numbersOfCritical > 0 ? STATUS_CRITICAL : numbersOfWarning > 0 ? STATUS_WARNING : STATUS_HEALTH;

function AlertPageHeader({
  activeAlerts,
  critical,
  warning,
}: {
  activeAlerts: number;
  critical: number;
  warning: number;
}) {
  const navigate = useBasenameRelativeNavigate();
  const intl = useIntl();
  const alertStatus = getAlertStatus(critical, warning);

  const { canConfigureEmailNotification } = useUserAccessRight();

  return (
    <AlertPageHeaderContainer>
      <Stack style={{ flex: '1 1 auto', minWidth: 0 }}>
        <Title>
          <AlertStatusIcon>
            <StatusWrapper status={alertStatus}>
              <StatusIcon status={alertStatus} name="Alert" entity="Alerts" />
            </StatusWrapper>
          </AlertStatusIcon>
          <>
            {intl.formatMessage({
              id: 'alerts',
            })}
          </>
        </Title>

        <SecondaryTitle>
          <>
            {intl.formatMessage({
              id: 'active_alerts',
            })}
          </>
          <TextBadge variant="infoPrimary" text={activeAlerts + ''} />
        </SecondaryTitle>

        <TertiaryTitle>
          <div>
            Critical
            <TextBadge variant="statusCritical" text={`${critical}`} />
          </div>
          <div>
            Warning
            <TextBadge variant="statusWarning" text={`${warning}`} />
          </div>
        </TertiaryTitle>
      </Stack>
      {canConfigureEmailNotification ? (
        <Button
          label="Email notification configuration"
          variant="secondary"
          onClick={() => {
            navigate('/configure-alerts');
          }}
        />
      ) : null}
    </AlertPageHeaderContainer>
  );
}

type ActiveAlertTabProps = {
  columns: Record<string, unknown>[];
  data: Alert[];
  status: QueryStatus;
};

const ActiveAlertTab = React.memo(
  ({ columns, data, status }: ActiveAlertTabProps) => {
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
          const dateA = new Date(a).getTime();
          const dateB = new Date(b).getTime();
          return dateA - dateB;
        },
      };
    }, []);
    const DEFAULT_SORTING_KEY = 'severity';
    return (
      <Table
        revealDroppedColumns
        columns={columns}
        data={data}
        defaultSortingKey={DEFAULT_SORTING_KEY}
        sortTypes={sortTypes}
        status={status}
        entityName={{
          en: {
            singular: 'active alert',
            plural: 'active alerts',
          },
        }}
      >
        <Wrap padding={spacing.r16}>
          <Table.SearchWithQueryParams />
          <p></p>
        </Wrap>
        <Table.SingleSelectableContent
          rowHeight="h48"
          separationLineVariant="backgroundLevel1"
          customItemKey={(index, data) => {
            // @ts-expect-error - FIXME when you are working on it
            return data[index].id;
          }}
        />
      </Table>
    );
  },
  (prevProps: ActiveAlertTabProps, nextProps: ActiveAlertTabProps) => {
    return (
      isEqual(prevProps.columns, nextProps.columns) &&
      isEqualAlert(prevProps.data, nextProps.data) &&
      prevProps.status === nextProps.status
    );
  },
);
export default function AlertPage() {
  const alerts = useAlerts({});
  const leafAlerts = useMemo(
    () => alerts?.alerts?.filter((alert) => !alert.labels.children) || [],
    [JSON.stringify(alerts?.alerts)],
  );
  const criticalAlerts = leafAlerts.filter((alert) => alert.severity === 'critical');
  const wariningAlerts = leafAlerts.filter((alert) => alert.severity === 'warning');
  const columns = React.useMemo(
    () => [
      {
        Header: 'Severity',
        accessor: 'severity',
        cellStyle: {
          textAlign: 'center',
          flex: 1,
          minWidth: '6.5rem',
        },
        sortType: 'severity',
        Cell: (cell) => <CircleStatus status={cell.value} />,
      },
      {
        Header: 'Name',
        accessor: 'labels.alertname',
        cellStyle: {
          flex: 2,
          minWidth: '10rem',
        },
        sortType: 'name',
      },
      {
        Header: 'Description',
        cellStyle: {
          minWidth: '10rem',
          flex: 12,
        },
        accessor: (row) => row.description || row.summary,
        Cell: (cell) => <ConstrainedText lineClamp={2} text={cell.value} />,
      },
      {
        Header: 'Active since',
        dropAt: 620,
        accessor: 'startsAt',
        cellStyle: {
          minWidth: '9rem',
          flex: 2,
          textAlign: 'right',
          marginRight: spacing.r12,
        },
        Cell: (cell) => <FormattedDateTime value={new Date(cell.value)} format="date-time-second" />,
      },
    ],
    [],
  );
  return (
    <AppContainer>
      <AppContainer.OverallSummary hasTopMargin>
        <AlertPageHeader
          activeAlerts={leafAlerts.length}
          critical={criticalAlerts.length}
          warning={wariningAlerts.length}
        />
      </AppContainer.OverallSummary>
      <AppContainer.MainContent>
        <ActiveAlertTab data={leafAlerts} columns={columns} status={alerts.status} />
      </AppContainer.MainContent>
    </AppContainer>
  );
}
