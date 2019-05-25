import React, { useState, useEffect } from 'react';
import { connect } from 'react-redux';
import memoizeOne from 'memoize-one';
import { sortBy as sortByArray } from 'lodash';
import { injectIntl, FormattedDate, FormattedTime } from 'react-intl';
import {
  fetchAlertsAction,
  fetchClusterStatusAction
} from '../ducks/app/monitoring';
import styled from 'styled-components';

import { Table } from 'core-ui';
import { brand, padding } from 'core-ui/dist/style/theme';

const PageContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: ${padding.larger};
`;

const TableContainer = styled.div`
  flex-grow: 1;
  /* FIXME We need to find a way to define the max-height */
  max-height: 400px;
`;

const PageTitle = styled.h2`
  margin-top: 0;
`;

const PageSubtitle = styled.h3``;

const ClusterStatusTitleContainer = styled.div`
  display: flex;
  align-items: center;
`;

const ClusterStatusValue = styled.span`
  margin-left: ${padding.small};
  font-weight: bold;
  color: ${props => (props.isUp ? brand.success : brand.danger)};
`;

const ClusterMonitoring = props => {
  useEffect(() => {
    props.fetchAlerts();
    props.fetchClusterStatus();
  }, []);

  const [sortBy, setSortBy] = useState('name');
  const [sortDirection, setSortDirection] = useState('ASC');

  const onSort = ({ sortBy, sortDirection }) => {
    setSortBy(sortBy);
    setSortDirection(sortDirection);
  };

  // It's a copy paste from NodeList, we may need to extract this code later.
  const sortAlerts = memoizeOne((nodes, sortBy, sortDirection) => {
    const sortedList = sortByArray(nodes, [
      node => {
        return typeof node[sortBy] === 'string'
          ? node[sortBy].toLowerCase()
          : node[sortBy];
      }
    ]);

    if (sortDirection === 'DESC') {
      sortedList.reverse();
    }
    return sortedList;
  });

  const columns = [
    {
      label: props.intl.messages.name,
      dataKey: 'name',
      width: 250
    },
    {
      label: props.intl.messages.severity,
      dataKey: 'severity',
      width: 100
    },
    {
      label: props.intl.messages.message,
      dataKey: 'message',
      flexGrow: 1
    },
    {
      label: props.intl.messages.active_at,
      dataKey: 'activeAt',
      width: 200,
      renderer: data => (
        <span>
          <FormattedDate value={data} />{' '}
          <FormattedTime
            hour="2-digit"
            minute="2-digit"
            second="2-digit"
            value={data}
          />
        </span>
      )
    }
  ];

  const alerts = props.alerts.map(alert => {
    return {
      name: alert.labels.alertname,
      severity: alert.labels.severity,
      message: alert.annotations.message,
      activeAt: alert.activeAt
    };
  });

  const sortedAlerts = sortAlerts(alerts, sortBy, sortDirection);

  const isUp = props.clusterStatus && props.clusterStatus.length === 0;

  return (
    <PageContainer>
      <PageTitle>{props.intl.messages.cluster_monitoring}</PageTitle>
      <ClusterStatusTitleContainer>
        <PageSubtitle>{props.intl.messages.cluster_status + ' :'}</PageSubtitle>
        <ClusterStatusValue isUp={isUp}>
          {isUp
            ? props.intl.messages.cluster_up_and_running
            : props.intl.messages.down}
        </ClusterStatusValue>
      </ClusterStatusTitleContainer>

      <PageSubtitle>{props.intl.messages.alert_list + ' :'}</PageSubtitle>
      <TableContainer>
        <Table
          list={sortedAlerts}
          columns={columns}
          headerHeight={40}
          rowHeight={40}
          sortBy={sortBy}
          sortDirection={sortDirection}
          onSort={onSort}
        />
      </TableContainer>
    </PageContainer>
  );
};

const mapStateToProps = state => {
  return {
    alerts: state.app.monitoring.alertList,
    clusterStatus: state.app.monitoring.clusterStatus
  };
};

const mapDispatchToProps = dispatch => {
  return {
    fetchAlerts: () => dispatch(fetchAlertsAction()),
    fetchClusterStatus: () => dispatch(fetchClusterStatusAction())
  };
};

export default injectIntl(
  connect(
    mapStateToProps,
    mapDispatchToProps
  )(ClusterMonitoring)
);
