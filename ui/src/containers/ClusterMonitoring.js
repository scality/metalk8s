import React, { useState, useEffect } from 'react';
import { connect } from 'react-redux';
import { injectIntl, FormattedDate, FormattedTime } from 'react-intl';
import styled from 'styled-components';
import { Loader as LoaderCoreUI } from '@scality/core-ui';
import { Table } from '@scality/core-ui';
import { padding, fontWeight } from '@scality/core-ui/dist/style/theme';
import CircleStatus from '../components/CircleStatus';
import Tooltip from '../components/Tooltip';
import {
  refreshClusterStatusAction,
  refreshAlertsAction,
  stopRefreshAlertsAction,
  stopRefreshClusterStatusAction,
  CLUSTER_STATUS_UP,
  CLUSTER_STATUS_DOWN
} from '../ducks/app/monitoring';
import { STATUS_CRITICAL, STATUS_SUCCESS } from '../constants';
import { sortSelector } from '../services/utils';
import NoRowsRenderer from '../components/NoRowsRenderer';

const PageContainer = styled.div`
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: ${padding.larger};

  .sc-loader {
    padding: 0 ${padding.smaller};
  }
`;

const TableContainer = styled.div`
  flex-grow: 1;

  .sc-table-column-cell-container-severity {
    justify-content: center;
  }
`;

const PageSubtitle = styled.h3`
  margin: ${padding.small} 0;
  display: flex;
  align-items: center;
`;

const ClusterStatusTitleContainer = styled.div`
  display: flex;
  align-items: center;
`;

const ClusterStatusValue = styled.span`
  margin: 0 ${padding.small};
  font-weight: bold;
  color: ${props =>
    props.isUp ? props.theme.brand.success : props.theme.brand.danger};
`;

const QuestionMarkIcon = styled.i`
  color: ${props => props.theme.brand.primary};
`;

const TooltipContent = styled.div`
  color: ${props => props.theme.brand.secondary};
  font-weight: ${fontWeight.bold};
`;

const ControlPlaneStatusLabel = styled.span`
  margin-left: ${padding.smaller};
`;

const ClusterMonitoring = props => {
  const {
    refreshAlerts,
    stopRefreshAlerts,
    refreshClusterStatus,
    stopRefreshClusterStatus
  } = props;

  useEffect(() => {
    refreshAlerts();
    return () => stopRefreshAlerts();
  }, [refreshAlerts, stopRefreshAlerts]);

  useEffect(() => {
    refreshClusterStatus();
    return () => stopRefreshClusterStatus();
  }, [refreshClusterStatus, stopRefreshClusterStatus]);

  const [sortBy, setSortBy] = useState('name');
  const [sortDirection, setSortDirection] = useState('ASC');

  const onSort = ({ sortBy, sortDirection }) => {
    setSortBy(sortBy);
    setSortDirection(sortDirection);
  };

  const columns = [
    {
      label: props.intl.messages.name,
      dataKey: 'name',
      width: 250
    },
    {
      label: props.intl.messages.severity,
      dataKey: 'severity',
      width: 100,
      renderer: data => {
        return <CircleStatus className="fas fa-circle" status={data} />;
      }
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

  const alerts = props.alerts.list
    .filter(alert => alert.state !== 'pending')
    .map(alert => {
      return {
        name: alert.labels.alertname,
        severity: alert.labels.severity,
        message: alert.annotations.message,
        activeAt: alert.activeAt
      };
    });

  const checkControlPlaneStatus = jobCount =>
    jobCount > 0 ? STATUS_SUCCESS : STATUS_CRITICAL;

  const apiServerStatus = checkControlPlaneStatus(
    props.cluster.apiServerStatus
  );
  const kubeSchedulerStatus = checkControlPlaneStatus(
    props.cluster.kubeSchedulerStatus
  );
  const kubeControllerManagerStatus = checkControlPlaneStatus(
    props.cluster.kubeControllerManagerStatus
  );

  const sortedAlerts = sortSelector(alerts, sortBy, sortDirection);

  return (
    <PageContainer>
      <ClusterStatusTitleContainer>
        <PageSubtitle>{props.intl.messages.cluster_status + ' :'}</PageSubtitle>
        <ClusterStatusValue
          isUp={props.clusterStatus.value === CLUSTER_STATUS_UP}
        >
          {props.clusterStatus.label}
        </ClusterStatusValue>
        <Tooltip
          placement="right"
          overlay={
            <TooltipContent>
              <div>
                <CircleStatus status={apiServerStatus} />
                <ControlPlaneStatusLabel>
                  {props.intl.messages.api_server}
                </ControlPlaneStatusLabel>
              </div>
              <div>
                <CircleStatus status={kubeSchedulerStatus} />
                <ControlPlaneStatusLabel>
                  {props.intl.messages.kube_scheduler}
                </ControlPlaneStatusLabel>
              </div>
              <div>
                <CircleStatus status={kubeControllerManagerStatus} />
                <ControlPlaneStatusLabel>
                  {props.intl.messages.kube_controller_manager}
                </ControlPlaneStatusLabel>
              </div>
            </TooltipContent>
          }
        >
          <QuestionMarkIcon className="fas fa-question-circle" />
        </Tooltip>
        {props.clusterStatus.isLoading ? <LoaderCoreUI size="small" /> : null}
      </ClusterStatusTitleContainer>

      <PageSubtitle>
        {props.intl.messages.alerts}
        {props.alerts.isLoading ? <LoaderCoreUI size="small" /> : null}
      </PageSubtitle>
      <TableContainer>
        <Table
          list={sortedAlerts}
          columns={columns}
          headerHeight={40}
          rowHeight={40}
          sortBy={sortBy}
          sortDirection={sortDirection}
          onSort={onSort}
          noRowsRenderer={() => (
            <NoRowsRenderer content={props.intl.messages.no_data_available} />
          )}
        />
      </TableContainer>
    </PageContainer>
  );
};

const mapStateToProps = (state, props) => {
  return {
    alerts: state.app.monitoring.alert,
    clusterStatus: makeClusterStatus(state, props),
    cluster: state.app.monitoring.cluster
  };
};

const makeClusterStatus = (state, props) => {
  const cluster = state.app.monitoring.cluster;
  let label = props.intl.messages.down;
  let value = CLUSTER_STATUS_DOWN;

  if (
    cluster.apiServerStatus > 0 &&
    cluster.kubeSchedulerStatus > 0 &&
    cluster.kubeControllerManagerStatus > 0
  ) {
    value = CLUSTER_STATUS_UP;
    label = props.intl.messages.cluster_up_and_running;
  }

  if (cluster.error) {
    value = CLUSTER_STATUS_DOWN;
    label = props.intl.messages[cluster.error] || cluster.error;
  }

  return { value, label, isLoading: cluster.isLoading };
};

const mapDispatchToProps = dispatch => {
  return {
    refreshClusterStatus: () => dispatch(refreshClusterStatusAction()),
    refreshAlerts: () => dispatch(refreshAlertsAction()),
    stopRefreshAlerts: () => dispatch(stopRefreshAlertsAction()),
    stopRefreshClusterStatus: () => dispatch(stopRefreshClusterStatusAction())
  };
};

export default injectIntl(
  connect(
    mapStateToProps,
    mapDispatchToProps
  )(ClusterMonitoring)
);
