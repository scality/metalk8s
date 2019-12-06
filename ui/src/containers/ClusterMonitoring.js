import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { injectIntl, FormattedDate, FormattedTime } from 'react-intl';
import styled from 'styled-components';
import { Loader as LoaderCoreUI } from '@scality/core-ui';
import { Table, Tooltip, Button } from '@scality/core-ui';
import { padding, fontWeight } from '@scality/core-ui/dist/style/theme';
import CircleStatus from '../components/CircleStatus';
import {
  refreshClusterStatusAction,
  refreshAlertsAction,
  stopRefreshAlertsAction,
  stopRefreshClusterStatusAction,
  CLUSTER_STATUS_UP,
  CLUSTER_STATUS_DOWN,
  CLUSTER_STATUS_UNKNOWN,
} from '../ducks/app/monitoring';
import {
  STATUS_CRITICAL,
  STATUS_SUCCESS,
  STATUS_BANNER_WARNING,
} from '../constants';
import { sortSelector } from '../services/utils';
import NoRowsRenderer from '../components/NoRowsRenderer';
import Banner from '../components/Banner';

const VOLUME_PROVISION_DOC_REFERENCE =
  'MetalK8s Quickstart Guide > Deployment of the Bootstrap node > Installation > Provision storage for Prometheus services';

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
  height: 100%;
  flex-grow: 1;

  .sc-table-column-cell-container-severity {
    justify-content: center;
  }
`;

const PageSubtitle = styled.h3`
  color: ${props => props.theme.brand.text};
  margin: ${padding.small} 0;
  display: flex;
  align-items: center;
`;

const ClusterStatusTitleContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const LeftClusterStatusContainer = styled.div`
  display: flex;
  align-items: center;
  .sc-tooltip-overlay-text {
    white-space: nowrap;
    text-align: left;
  }
`;

const RightClusterStatusContainer = styled.div`
  display: flex;
`;

const ClusterStatusValue = styled.span`
  margin: 0 ${padding.small};
  font-weight: bold;
  color: ${props => {
    switch (props.value) {
      case CLUSTER_STATUS_UNKNOWN:
        return props.theme.brand.warning;
      case CLUSTER_STATUS_UP:
        return props.theme.brand.success;
      default:
        return props.theme.brand.danger;
    }
  }};
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
  const dispatch = useDispatch();
  const alerts = useSelector(state => state.app.monitoring.alert);
  const clusterStatus = useSelector(state => makeClusterStatus(state, props));
  const cluster = useSelector(state => state.app.monitoring.cluster);
  const config = useSelector(state => state.config);
  const { intl } = props;

  useEffect(() => {
    dispatch(refreshAlertsAction());
    return () => dispatch(stopRefreshAlertsAction());
  }, [dispatch]);

  useEffect(() => {
    dispatch(refreshClusterStatusAction());
    return () => dispatch(stopRefreshClusterStatusAction());
  }, [dispatch]);

  const [sortBy, setSortBy] = useState('name');
  const [sortDirection, setSortDirection] = useState('ASC');

  const onSort = ({ sortBy, sortDirection }) => {
    setSortBy(sortBy);
    setSortDirection(sortDirection);
  };

  const columns = [
    {
      label: intl.messages.name,
      dataKey: 'name',
      width: 250,
    },
    {
      label: intl.messages.severity,
      dataKey: 'severity',
      width: 100,
      renderer: data => {
        return <CircleStatus className="fas fa-circle" status={data} />;
      },
    },
    {
      label: intl.messages.message,
      dataKey: 'message',
      flexGrow: 1,
    },
    {
      label: intl.messages.active_at,
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
      ),
    },
  ];

  const alertsList = alerts.list
    .filter(alert => alert.state !== 'pending')
    .map(alert => {
      return {
        name: alert.labels.alertname,
        severity: alert.labels.severity,
        message: alert.annotations.message,
        activeAt: alert.activeAt,
      };
    });

  const checkControlPlaneStatus = jobCount =>
    jobCount > 0 ? STATUS_SUCCESS : STATUS_CRITICAL;

  const apiServerStatus = checkControlPlaneStatus(cluster.apiServerStatus);
  const kubeSchedulerStatus = checkControlPlaneStatus(
    cluster.kubeSchedulerStatus,
  );
  const kubeControllerManagerStatus = checkControlPlaneStatus(
    cluster.kubeControllerManagerStatus,
  );

  const sortedAlerts = sortSelector(alertsList, sortBy, sortDirection);

  return (
    <PageContainer>
      <ClusterStatusTitleContainer>
        <LeftClusterStatusContainer>
          <PageSubtitle>{intl.messages.cluster_status + ' :'}</PageSubtitle>
          <ClusterStatusValue value={clusterStatus.value}>
            {clusterStatus.label}
          </ClusterStatusValue>
          <Tooltip
            placement="right"
            overlay={
              <TooltipContent>
                <div>
                  <CircleStatus status={apiServerStatus} />
                  <ControlPlaneStatusLabel>
                    {intl.messages.api_server}
                  </ControlPlaneStatusLabel>
                </div>
                <div>
                  <CircleStatus status={kubeSchedulerStatus} />
                  <ControlPlaneStatusLabel>
                    {intl.messages.kube_scheduler}
                  </ControlPlaneStatusLabel>
                </div>
                <div>
                  <CircleStatus status={kubeControllerManagerStatus} />
                  <ControlPlaneStatusLabel>
                    {intl.messages.kube_controller_manager}
                  </ControlPlaneStatusLabel>
                </div>
              </TooltipContent>
            }
          >
            <QuestionMarkIcon className="fas fa-question-circle" />
          </Tooltip>
          {clusterStatus.isLoading ? <LoaderCoreUI size="small" /> : null}
        </LeftClusterStatusContainer>
        <RightClusterStatusContainer>
          <Tooltip
            placement="left"
            overlay={
              <TooltipContent>
                {intl.messages.advanced_monitoring}
              </TooltipContent>
            }
          >
            <Button
              icon={<i className="fas fa-chart-line" />}
              onClick={() => {
                window.open(config.api.url_grafana, '_blank');
              }}
              size="larger"
              inverted={true}
            ></Button>
          </Tooltip>
        </RightClusterStatusContainer>
      </ClusterStatusTitleContainer>
      {cluster.isPrometheusVolumeProvisioned ? null : (
        <Banner
          type={STATUS_BANNER_WARNING}
          icon={<i className="fas fa-exclamation-triangle" />}
          title={intl.messages.prometheus_not_available}
          messages={[
            <>
              {`${intl.messages.please_refer_to} ${VOLUME_PROVISION_DOC_REFERENCE}`}
            </>,
          ]}
        />
      )}
      <PageSubtitle>
        {intl.messages.alerts}
        {alerts.isLoading ? <LoaderCoreUI size="small" /> : null}
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
            <NoRowsRenderer content={intl.messages.no_data_available} />
          )}
        />
      </TableContainer>
    </PageContainer>
  );
};

const makeClusterStatus = (state, props) => {
  const { intl } = props;
  const cluster = state.app.monitoring.cluster;
  let label = intl.messages.down;
  let value = CLUSTER_STATUS_DOWN;
  if (
    cluster.apiServerStatus > 0 &&
    cluster.kubeSchedulerStatus > 0 &&
    cluster.kubeControllerManagerStatus > 0
  ) {
    value = CLUSTER_STATUS_UP;
    label = intl.messages.cluster_up_and_running;
  }
  if (cluster.error) {
    value = CLUSTER_STATUS_DOWN;
    label = intl.messages[cluster.error] || cluster.error;
  }
  if (!state.app.monitoring.isPrometheusApiUp) {
    value = CLUSTER_STATUS_UNKNOWN;
    label = intl.messages[cluster.error] || cluster.error;
  }
  return { value, label, isLoading: cluster.isLoading };
};

export default injectIntl(ClusterMonitoring);
