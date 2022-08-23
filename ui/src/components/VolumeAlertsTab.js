import React from 'react';
import { useLocation } from 'react-router';
import { useIntl } from 'react-intl';
import { Chips, ConstrainedText } from '@scality/core-ui';
import { Box, Table } from '@scality/core-ui/dist/next';
import { NoResult } from '@scality/core-ui/dist/components/tablev2/Tablestyle';
import ActiveAlertsFilters from './ActiveAlertsFilters';
import { formatDateToMid1 } from '../services/utils';

const ActiveAlertsCard = ({ alertlist, PVCName }) => {
  const location = useLocation();
  const intl = useIntl();
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

  const columns = [
    {
      Header: 'Name',
      accessor: 'name',
      cellStyle: { width: '13rem' },
    },
    {
      Header: 'Severity',
      accessor: 'severity',
      cellStyle: { width: '4.5rem' },
      Cell: ({ value }) => {
        return <Chips text={value} variant={value} />;
      },
    },
    {
      Header: 'Description',
      accessor: 'alert_description',
      cellStyle: { flex: 1, paddingLeft: '1rem' },
      Cell: ({ value }) => {
        return <ConstrainedText lineClamp={2} text={value} />;
      },
    },
    {
      Header: 'Active since',
      accessor: 'active_since',
      cellStyle: { textAlign: 'center', width: '7rem' },
      Cell: ({ value }) => {
        return <span>{formatDateToMid1(value)}</span>;
      },
    },
  ];

  return (
    <Box display="flex" flexDirection="column" height="100%" margin="1rem">
      <Box display="flex" justifyContent={'flex-end'}>
        {PVCName && alertlist?.length !== 0 && <ActiveAlertsFilters />}
      </Box>
      <Box pt="1rem" flex={1}>
        <Table columns={columns} data={activeAlertListData}>
          <Table.SingleSelectableContent
            rowHeight="h48"
            separationLineVariant="backgroundLevel2"
            backgroundVariant="backgroundLevel4"
            children={(Rows) => {
              if (!PVCName) {
                return (
                  <NoResult>
                    {intl.formatMessage({ id: 'volume_is_not_bound' })}
                  </NoResult>
                );
              } else if (PVCName && alertlist.length === 0)
                return (
                  <NoResult>
                    {intl.formatMessage({ id: 'no_active_alerts' })}
                  </NoResult>
                );
              return <>{Rows}</>;
            }}
          />
        </Table>
      </Box>
    </Box>
  );
};

export default ActiveAlertsCard;
