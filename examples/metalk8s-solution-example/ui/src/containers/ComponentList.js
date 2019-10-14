import React, { useState, useEffect } from 'react';
import { connect, useDispatch, useSelector } from 'react-redux';
import { withRouter } from 'react-router-dom';
import { useHistory } from 'react-router';
import styled from 'styled-components';
import { injectIntl } from 'react-intl';
import { Table, Button } from '@scality/core-ui';
import { padding } from '@scality/core-ui/dist/style/theme';
import { sortSelector } from '../services/utils';
import NoRowsRenderer from '../components/NoRowsRenderer';
import {
  refreshHyperdriveAction,
  stopRefreshHyperdriveAction,
} from '../ducks/app/hyperdrive';
import {
  refreshVersionServerAction,
  stopRefreshVersionServerAction,
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

const ComponentList = props => {
  const { intl, versionServers, match } = props;
  const dispatch = useDispatch();
  const history = useHistory();
  const hyperdrives = useSelector(state => state.app.hyperdrive.list);
  const environment = match.params.name;

  // console.log('ComponentList hyperdrives', hyperdrives);

  useEffect(() => {
    dispatch(refreshHyperdriveAction());
    return () => {
      dispatch(stopRefreshHyperdriveAction());
    };
  }, [refreshHyperdriveAction, stopRefreshHyperdriveAction]);

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
      flexGrow: 1,
    },
    {
      label: intl.messages.version,
      dataKey: 'version',
    },
    {
      label: intl.messages.status,
      dataKey: 'status',
    },
    {
      label: intl.messages.replicas,
      dataKey: 'replicas',
    },
  ];
  const columnsCS = [
    {
      label: intl.messages.name,
      dataKey: 'name',
      flexGrow: 1,
    },
    {
      label: intl.messages.version,
      dataKey: 'version',
    },
    {
      label: intl.messages.status,
      dataKey: 'status',
    },
    {
      label: intl.messages.timezone,
      dataKey: 'timezone',
    },
  ];

  const hyperdriveColumns = [
    {
      label: intl.messages.name,
      dataKey: 'name',
      flexGrow: 1,
    },
    {
      label: intl.messages.node,
      dataKey: 'node',
      flexGrow: 1,
    },
    {
      label: 'Number of Volumes',
      dataKey: 'volumeNb',
      flexGrow: 1,
    },
    {
      label: 'Creation Time',
      dataKey: 'creationTime',
      flexGrow: 1,
    },
  ];

  console.log('hyperdrives', hyperdrives);

  const hyperdriveData = hyperdrives.map(hyperdrive => ({
    name: hyperdrive.metadata.name,
    node: hyperdrive.spec.dataServers.nodeName,
    volumeNb: hyperdrive.spec.dataServers.data.length,
    creationTime: hyperdrive.metadata.creationTimestamp,
  }));
  console.log('hyperdriveData', hyperdriveData);

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
    sortDirectionVS,
  );

  return (
    <ComponentContainer>
      <ListContainer>
        <ActionContainer>
          <Button
            text={intl.messages.create_hyperdrive}
            onClick={() =>
              history.push(`/environments/${environment}/hyperdrive/create`)
            }
            icon={<i className="fas fa-plus" />}
          />
        </ActionContainer>
        <TableContainer>
          <Table
            list={hyperdriveData}
            columns={hyperdriveColumns}
            disableHeader={false}
            headerHeight={40}
            rowHeight={40}
            sortBy={sortByVS}
            sortDirection={sortDirectionVS}
            onSort={onSortVS}
            noRowsRenderer={() => (
              <NoRowsRenderer content={intl.messages.no_component_available} />
            )}
          />
        </TableContainer>
      </ListContainer>
      <ListContainer>
        <ActionContainer>
          <Button
            text={intl.messages.create_hyperdrive_controller}
            onClick={() =>
              history.push(
                `/environments/${environment}/hyperdrive-controller/create`,
              )
            }
            icon={<i className="fas fa-plus" />}
          />
        </ActionContainer>
        <TableContainer>
          <Table
            list={[]}
            columns={columnsCS}
            disableHeader={false}
            headerHeight={40}
            rowHeight={40}
            sortBy={sortByCS}
            sortDirection={sortDirectionCS}
            onSort={onSortCS}
            onRowClick={row => {
              history.push(
                `/environments/${environment}/clockServer/${row.rowData.name}/edit`,
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
    versionServers: state.app.versionServer.list,
  };
}
const mapDispatchToProps = dispatch => {
  return {
    refreshVersionServer: environment =>
      dispatch(refreshVersionServerAction(environment)),
    stopRefreshVersionServer: () => dispatch(stopRefreshVersionServerAction()),
  };
};

export default injectIntl(
  withRouter(
    connect(
      mapStateToProps,
      mapDispatchToProps,
    )(ComponentList),
  ),
);
