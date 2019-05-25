import React, { useEffect } from 'react';
import { connect } from 'react-redux';
import { injectIntl, FormattedDate, FormattedTime } from 'react-intl';
import {
  fetchAlertsAction,
  fetchClusterStatusAction
} from '../ducks/app/alerts';
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

const CusterStatus = props => {
  useEffect(() => {
    props.fetchAlerts();
    props.fetchClusterStatus();
  }, []);

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
      width: 230,
      renderer: data => (
        <span>
          <FormattedDate value={data} /> <FormattedTime value={data} />
        </span>
      )
    }
  ];

  const data = props.alerts.map(alert => {
    return {
      name: alert.labels.alertname,
      severity: alert.labels.severity,
      message: alert.annotations.message,
      activeAt: alert.activeAt
    };
  });

  const isUp = props.clusterStatus && props.clusterStatus.length === 0;

  return (
    <PageContainer>
      <PageTitle>Cluster Monitoring</PageTitle>
      <ClusterStatusTitleContainer>
        <PageSubtitle>Cluster Status : </PageSubtitle>
        <ClusterStatusValue isUp={isUp}>
          {isUp ? 'Everything is up and running' : 'DOWN'}
        </ClusterStatusValue>
      </ClusterStatusTitleContainer>

      <PageSubtitle>Alerts List:</PageSubtitle>
      <TableContainer>
        <Table list={data} columns={columns} headerHeight={40} rowHeight={40} />
      </TableContainer>
    </PageContainer>
  );
};

const mapStateToProps = state => {
  return {
    alerts: state.app.alerts.list,
    clusterStatus: state.app.alerts.clusterStatus
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
  )(CusterStatus)
);
