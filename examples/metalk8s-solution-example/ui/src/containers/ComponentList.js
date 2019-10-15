import React, { useState, useEffect } from 'react';
import { connect, useDispatch, useSelector } from 'react-redux';
import { withRouter } from 'react-router-dom';
import { useHistory } from 'react-router';
import styled from 'styled-components';
import { injectIntl } from 'react-intl';
import { Table, Button } from '@scality/core-ui';
import { padding } from '@scality/core-ui/dist/style/theme';

import { sortSelector, useRefreshEffect } from '../services/utils';
import {
  refreshHyperdriveAction,
  stopRefreshHyperdriveAction,
  startPollingHyperdriveControllerAction,
  stopPollingHyperdriveControllerAction,
} from '../ducks/app/hyperdrive';
import {
  refreshVersionServerAction,
  stopRefreshVersionServerAction,
} from '../ducks/app/versionServer';
import NoRowsRenderer from '../components/NoRowsRenderer';
import {
  InformationListContainer,
  InformationSpan,
  InformationLabel,
  InformationValue,
  InformationMainValue,
} from '../components/InformationList';

const ComponentContainer = styled.div`
  box-sizing: border-box;
  display: flex;
  justify-content: space-between;
  height: 350px;
`;

const ActionContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const TableContainer = styled.div`
  flex-grow: 1;
  display: flex;
  box-sizing: border-box;
  flex-direction: column;
`;

const ListContainer = styled.div`
  display: flex;
  flex-direction: column;
  width: calc(50% - 10px);
`;

const HyperdriveControllerInformations = styled(InformationListContainer)`
  margin: 0;
`;

const HDInformationSpan = styled.span``;

const ComponentList = props => {
  const { intl, match } = props;
  const history = useHistory();
  const hyperdrives = useSelector(state => state.app.hyperdrive.list);
  const environment = match.params.name;
  const hdcontrollers = useSelector(
    state => state.app.hyperdrive.hyperdriveControllers,
  );

  // take the first hdcontrollers

  useRefreshEffect(refreshHyperdriveAction, stopRefreshHyperdriveAction, {
    environment,
  });
  useRefreshEffect(
    startPollingHyperdriveControllerAction,
    stopPollingHyperdriveControllerAction,
    { environment },
  );

  const [HDSortBy, setHDSortBy] = useState('name');
  const [HDSortDirection, setHDSortDirection] = useState('ASC');

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

  const hyperdriveData = hyperdrives.map(hyperdrive => ({
    name: hyperdrive.metadata.name,
    node: hyperdrive.spec.dataServers.nodeName,
    volumeNb: hyperdrive.spec.dataServers.data.length,
    creationTime: hyperdrive.metadata.creationTimestamp,
  }));

  const onSortHD = ({ sortBy, sortDirection }) => {
    setHDSortBy(sortBy);
    setHDSortDirection(sortDirection);
  };

  const sortedHyperdriveData = sortSelector(
    hyperdriveData,
    HDSortBy,
    HDSortDirection,
  );

  if (hdcontrollers.length > 0) {
    console.log('hyperdrivesController', hdcontrollers[0]);
  }

  return (
    <ComponentContainer>
      <ListContainer>
        <ActionContainer>
          <h3>Hyperdrive</h3>
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
            list={sortedHyperdriveData}
            columns={hyperdriveColumns}
            disableHeader={false}
            headerHeight={40}
            rowHeight={40}
            sortBy={HDSortBy}
            sortDirection={HDSortDirection}
            onSort={onSortHD}
            noRowsRenderer={() => (
              <NoRowsRenderer content={intl.messages.no_component_available} />
            )}
          />
        </TableContainer>
      </ListContainer>
      <ListContainer>
        <ActionContainer>
          <h3>Hyperdrive Controller</h3>
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
          <HyperdriveControllerInformations>
            <HDInformationSpan>
              <InformationLabel>{intl.messages.name}</InformationLabel>
              <InformationMainValue>{environment.name}</InformationMainValue>
            </HDInformationSpan>
            <HDInformationSpan>
              <InformationLabel>{intl.messages.status}</InformationLabel>
              <InformationValue>
                {intl.messages[environment.status] || environment.status}
              </InformationValue>
            </HDInformationSpan>
            <HDInformationSpan>
              <InformationLabel>{intl.messages.version}</InformationLabel>
              <InformationValue>toto</InformationValue>
            </HDInformationSpan>
            <HDInformationSpan>
              <InformationLabel>{intl.messages.description}</InformationLabel>
              <InformationValue>{environment.description}</InformationValue>
            </HDInformationSpan>
          </HyperdriveControllerInformations>
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
