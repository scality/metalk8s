import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useRouteMatch, useHistory } from 'react-router';
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

const ComponentLists = ({ intl }) => {
  const environments = useSelector(state => state.app.environment.list);
  const dispatch = useDispatch();
  const refreshClockServer = environment =>
    dispatch(refreshClockServerAction(environment));
  const refreshVersionServer = environment =>
    dispatch(refreshVersionServerAction(environment));
  const stopRefreshClockServer = environment =>
    dispatch(stopRefreshClockServerAction(environment));
  const stopRefreshVersionServer = environment =>
    dispatch(stopRefreshVersionServerAction(environment));

  const history = useHistory();
  const match = useRouteMatch();
  const environment = match.params.name;
  const currentEnvironment = environments.find(
    item => item.name === environment
  );
  const versionServers = currentEnvironment.versionServer
    ? currentEnvironment.versionServer.list
    : [];
  const clockServers = currentEnvironment.clockServer
    ? currentEnvironment.clockServer.list
    : [];

  useEffect(() => {
    refreshClockServer(environment);
    return () => {
      stopRefreshClockServer(environment);
    };
  }, []);

  useEffect(() => {
    refreshVersionServer(environment);
    return () => {
      stopRefreshVersionServer(environment);
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
              history.push(`/environments/${environment}/version-server/create`)
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
                `/environments/${environment}/version-server/${row.rowData.name}/edit`
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
            onClick={() =>
              history.push(`/environments/${environment}/clock-server/create`)
            }
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
                `/environments/${environment}/clock-server/${row.rowData.name}/edit`
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

export default injectIntl(ComponentLists);
