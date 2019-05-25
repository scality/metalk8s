import React, { useEffect } from 'react';
import { connect } from 'react-redux';
import { injectIntl } from 'react-intl';
import { fetchAlertsAction } from '../ducks/app/alerts';
import moment from 'moment';
import styled from 'styled-components';

import { Table } from 'core-ui';
import { padding } from 'core-ui/dist/style/theme';

const PageContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: ${padding.larger};
`;

const TableContainer = styled.div`
  flex-grow: 1;
`;

const PageTitle = styled.h2`
  margin-top: 0;
`;

const CusterStatus = props => {
  useEffect(() => {
    props.fetchAlerts();
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
      width: 230
    }
  ];

  const data = props.alerts.map(alert => {
    const activeAtMoment = moment(alert.activeAt);
    const alertActiveAt = activeAtMoment.format('YYYY-MM-DD HH:mm:ss Z');

    return {
      name: alert.labels.alertname,
      severity: alert.labels.severity,
      message: alert.annotations.message,
      activeAt: alertActiveAt
    };
  });

  return (
    <PageContainer>
      <PageTitle>Cluster Status</PageTitle>
      <TableContainer>
        <Table list={data} columns={columns} headerHeight={40} rowHeight={40} />
      </TableContainer>
    </PageContainer>
  );
};

const mapStateToProps = state => {
  return {
    alerts: state.app.alerts.list
  };
};

const mapDispatchToProps = dispatch => {
  return {
    fetchAlerts: () => dispatch(fetchAlertsAction())
  };
};

export default injectIntl(
  connect(
    mapStateToProps,
    mapDispatchToProps
  )(CusterStatus)
);
