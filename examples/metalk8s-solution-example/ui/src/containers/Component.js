import React, { useState, useEffect } from 'react';
import { connect } from 'react-redux';
import { withRouter } from 'react-router-dom';
import styled from 'styled-components';
import { injectIntl } from 'react-intl';
import { Table, Button } from '@scality/core-ui';
import { padding } from '@scality/core-ui/dist/style/theme';
import { sortSelector } from '../services/utils';
import NoRowsRenderer from '../components/NoRowsRenderer';
import {
  refreshClockServerAction,
  stopRefreshClockServerAction
} from '../ducks/app/clockServer';
import {
  refreshVersionServerAction,
  stopRefreshVersionServerAction
} from '../ducks/app/versionServer';

const ComponentContainer = styled.div`
  box-sizing: border-box;
  display: flex;
  height: 350px;
`;

const ActionContainer = styled.div`
  margin-bottom: ${padding.base};
  display: flex;
  align-items: center;
  .sc-button {
    margin-right: 15px;
  }
`;

const TableContainer = styled.div`
  flex-grow: 1;
  display: flex;
`;

const ListContainer = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  padding: ${padding.base};
`;

const Component = props => {
  const { intl, history, versionServers, clockServers, match } = props;
  const environment = match.params.name;

  useEffect(() => {
    props.refreshClockServer(environment);
    return () => {
      props.stopRefreshClockServer();
    };
  }, []);

  useEffect(() => {
    props.refreshVersionServer(environment);
    return () => {
      props.stopRefreshVersionServer();
    };
  }, []);

  const [sortByCS, setSortByCS] = useState('name');
  const [sortDirectionCS, setSortDirectionCS] = useState('ASC');
  const [sortByVS, setSortByVS] = useState('name');
  const [sortDirectionVS, setSortDirectionVS] = useState('ASC');

  const columnsVS = [
    {
      label: intl.messages.name,
      dataKey: 'name',
      flexGrow: 1
    },
    {
      label: intl.messages.version,
      dataKey: 'version'
    },
    {
      label: intl.messages.status,
      dataKey: 'status'
    },
    {
      label: intl.messages.replicas,
      dataKey: 'replicas'
    }
  ];
  const columnsCS = [
    {
      label: intl.messages.name,
      dataKey: 'name',
      flexGrow: 1
    },
    {
      label: intl.messages.version,
      dataKey: 'version'
    },
    {
      label: intl.messages.status,
      dataKey: 'status'
    },
    {
      label: intl.messages.timezone,
      dataKey: 'timezone'
    }
  ];

  const onSortVS = ({ sortBy, sortDirection }) => {
    setSortByVS(sortBy);
    setSortDirectionVS(sortDirection);
  };

  const onSortCS = ({ sortBy, sortDirection }) => {
    setSortByCS(sortBy);
    setSortDirectionCS(sortDirection);
  };
  const versionServerstSortedList = sortSelector(
    versionServers,
    sortByVS,
    sortDirectionVS
  );

  const clockServersSortedList = sortSelector(
    clockServers,
    sortByCS,
    sortDirectionCS
  );

  return (
    <ComponentContainer>
      <ListContainer>
        <ActionContainer>
          <Button
            text={intl.messages.create_version_server}
            onClick={() =>
              history.push(`/environments/${environment}/versionServer/create`)
            }
            icon={<i className="fas fa-plus" />}
          />
        </ActionContainer>
        <TableContainer>
          <Table
            list={versionServerstSortedList}
            columns={columnsVS}
            disableHeader={false}
            headerHeight={40}
            rowHeight={40}
            sortBy={sortByVS}
            sortDirection={sortDirectionVS}
            onSort={onSortVS}
            onRowClick={row => {
              history.push(
                `/environments/${environment}/versionServer/${row.rowData.name}/edit`
              );
            }}
            noRowsRenderer={() => (
              <NoRowsRenderer content={intl.messages.no_component_available} />
            )}
          />
        </TableContainer>
      </ListContainer>
      <ListContainer>
        <ActionContainer>
          <Button
            text={intl.messages.create_clock_server}
            onClick={() => history.push(`/environments/${environment}/clockServer/create`)}
            icon={<i className="fas fa-plus" />}
          />
        </ActionContainer>
        <TableContainer>
          <Table
            list={clockServersSortedList}
            columns={columnsCS}
            disableHeader={false}
            headerHeight={40}
            rowHeight={40}
            sortBy={sortByCS}
            sortDirection={sortDirectionCS}
            onSort={onSortCS}
            onRowClick={row => {
              history.push(
                `/environments/${environment}/clockServer/${row.rowData.name}/edit`
              );
            }}
            noRowsRenderer={() => (
              <NoRowsRenderer content={intl.messages.no_component_available} />
            )}
          />
        </TableContainer>
      </ListContainer>
    </ComponentContainer>
  );
};

function mapStateToProps(state) {
  return {
    clockServers: state.app.clockServer.list,
    versionServers: state.app.versionServer.list
  };
}
const mapDispatchToProps = dispatch => {
  return {
    refreshClockServer: environment => dispatch(refreshClockServerAction(environment)),
    refreshVersionServer: environment => dispatch(refreshVersionServerAction(environment)),
    stopRefreshClockServer: () => dispatch(stopRefreshClockServerAction()),
    stopRefreshVersionServer: () => dispatch(stopRefreshVersionServerAction())
  };
};

export default injectIntl(
  withRouter(
    connect(
      mapStateToProps,
      mapDispatchToProps
    )(Component)
  )
);
