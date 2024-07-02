import { ConstrainedText, FormattedDateTime, spacing } from '@scality/core-ui';
import { Box, Table } from '@scality/core-ui/dist/next';
import { STATUS_CRITICAL, STATUS_WARNING } from '../constants';
import { Alert } from '../services/alertUtils';
import { useURLQuery } from '../services/utils';
import ActiveAlertsFilter from './ActiveAlertsFilters';
import CircleStatus from './CircleStatus';

const AlertsTab = ({
  alerts,
  status,
}: {
  alerts: Alert[];
  status: 'idle' | 'loading' | 'error' | 'success';
}) => {
  const query = useURLQuery();
  // Retrieve the severity filter from URL.
  // Filter more than one severity, the URL should be:
  // `/nodes/<node-name>/alerts?severity=warning&severity=critical`
  let alertSeverity = query.getAll('severity');
  // Display all the alerts when there is no severity filter or when severity filter is 'all'.
  if (alertSeverity?.length === 0 || alertSeverity?.includes('all')) {
    alertSeverity.push(STATUS_WARNING, STATUS_CRITICAL);
  }
  const activeAlertListData =
    alerts
      ?.map((alert) => {
        return {
          name: alert.labels.alertname,
          severity: alert.labels.severity,
          alertDescription: alert.description || alert.summary,
          activeSince: alert.startsAt,
        };
      })
      ?.filter((alert) => alertSeverity.includes(alert.severity)) ?? [];
  const columns = [
    {
      Header: 'Name',
      accessor: 'name',
      cellStyle: {
        flex: 1,
        width: 'unset',
      },
    },
    {
      Header: 'Severity',
      accessor: 'severity',
      cellStyle: {
        flex: 0.5,
        textAlign: 'center',
        width: 'unset',
      },
      Cell: ({ value }) => {
        return <CircleStatus name="Circle-health" status={value} />;
      },
    },
    {
      Header: 'Description',
      accessor: 'alertDescription',
      cellStyle: {
        flex: 3,
        width: 'unset',
        paddingLeft: '1rem',
      },
      Cell: ({ value }) => {
        return <ConstrainedText lineClamp={2} text={value} />;
      },
    },
    {
      Header: 'Active since',
      accessor: 'activeSince',
      cellStyle: {
        textAlign: 'right',
        flex: 1,
        marginRight: spacing.r16,
        width: 'unset',
      },
      Cell: ({ value }) => {
        return (
          <FormattedDateTime
            value={new Date(value)}
            format="date-time-second"
          />
        );
      },
    },
  ];
  return (
    <Box display="flex" flexDirection="column" height="100%" width="100%">
      <Box display="flex" justifyContent="flex-end" padding={spacing.r16}>
        <ActiveAlertsFilter />
      </Box>
      <Table
        columns={columns}
        data={activeAlertListData}
        status={status}
        entityName={{
          en: {
            singular: 'acitve alert',
            plural: 'active alerts',
          },
        }}
      >
        <Table.SingleSelectableContent
          rowHeight="h48"
          separationLineVariant="backgroundLevel2"
        />
      </Table>
    </Box>
  );
};

export default AlertsTab;
