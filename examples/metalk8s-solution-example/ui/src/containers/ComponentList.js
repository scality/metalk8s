import React, { useState } from 'react';
import { connect, useSelector } from 'react-redux';
import { withRouter } from 'react-router-dom';
import { useHistory } from 'react-router';
import styled from 'styled-components';
import { injectIntl } from 'react-intl';
import { Table, Button } from '@scality/core-ui';

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
  InformationLabel,
  InformationValue,
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

const HDInformationSpan = styled.span`
  margin: 5px 0;
  display: flex;
`;

const SpanList = styled.div`
  display: flex;
  flex-direction: column;
`;

const SpanListItem = styled(InformationValue)`
  margin-bottom: 5px;
`;

const NoHyperdriveControllerContainer = styled.div`
  display: flex;
  flex-grow: 1;
  flex-direction: column;
  justify-content: center;
  align-items: center;
`;

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
          {hdcontrollers?.length > 0 ? (
            <Button
              text={'Edit Hyperdrive Controller'}
              onClick={() => {
                // TODO
              }}
              icon={<i className="fas fa-edit" />}
              disabled
            />
          ) : null}
        </ActionContainer>
        {hdcontrollers.length > 0 ? (
          <HyperdriveControllerInformations>
            <HDInformationSpan>
              <InformationLabel>{intl.messages.name}</InformationLabel>
              <InformationValue>
                {hdcontrollers?.[0]?.metadata?.name}
              </InformationValue>
            </HDInformationSpan>
            {/* FIXME
              It's a bit complicated to get the protection,
              we might might want to improve that in the payload before display
              the information on the UI.
             */}

            {/* 
            <HDInformationSpan>
              <InformationLabel>Protection Type</InformationLabel>
              <SpanList>
                <SpanListItem>
                  Standard Durability Replication COS 2
                </SpanListItem>
                <SpanListItem>Erasure Coding 2+1</SpanListItem>
              </SpanList>
            </HDInformationSpan>
            */}
            <HDInformationSpan>
              <InformationLabel>Hyperdrives</InformationLabel>
              <SpanList>
                {hdcontrollers[0]?.spec?.endpoints?.map((hd, idx) => (
                  <SpanListItem key={`${idx}_${hd?.serviceName}`}>
                    {hd?.serviceName}
                  </SpanListItem>
                ))}
              </SpanList>
            </HDInformationSpan>
          </HyperdriveControllerInformations>
        ) : (
          <NoHyperdriveControllerContainer>
            <HDInformationSpan>
              Please create a Hyperdrive Controller
              {/* FIXME Improve this text */}
            </HDInformationSpan>
            <Button
              text={intl.messages.create_hyperdrive_controller}
              onClick={() =>
                history.push(
                  `/environments/${environment}/hyperdrive-controller/create`,
                )
              }
              icon={<i className="fas fa-plus" />}
            />
          </NoHyperdriveControllerContainer>
        )}
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
