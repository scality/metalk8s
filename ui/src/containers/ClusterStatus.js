import React, { useEffect } from 'react';
import { connect } from 'react-redux';
import { injectIntl } from 'react-intl';
import { fetchAlertsAction } from '../ducks/app/alerts';
import styled from 'styled-components';

import { Table, Button } from 'core-ui';

const PageContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
`;

const TableContainer = styled.div`
  flex-grow: 1;
`;

const CusterStatus = props => {
  useEffect(() => {
    props.fetchAlerts();
  }, []);

  const columns = [
    {
      label: 'Name',
      dataKey: 'name'
    },
    {
      label: 'Severity',
      dataKey: 'severity'
    },
    {
      label: 'Message',
      dataKey: 'message'
    },
    {
      label: 'activeAt',
      dataKey: 'activeAt'
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

  return (
    <PageContainer>
      ClusterStatus
      <TableContainer>
        <Table list={data} columns={columns} headerHeight={40} rowHeight={40} />
      </TableContainer>
    </PageContainer>
  );
};

const mapStateToProps = state => {
  console.log('state.app.alerts.alerts', state.app);
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
