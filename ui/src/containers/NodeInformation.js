import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { FormattedDate, FormattedTime } from 'react-intl';
import styled from 'styled-components';
import { useLocation, useHistory, useRouteMatch } from 'react-router';
import { Switch, Route } from 'react-router-dom';
import { Table, Tabs } from '@scality/core-ui';
import { padding } from '@scality/core-ui/dist/style/theme';
import NoRowsRenderer from '../components/NoRowsRenderer';
import { fetchPodsAction } from '../ducks/app/pods';
import { refreshNodesAction, stopRefreshNodesAction } from '../ducks/app/nodes';
import {
  fetchVolumesAction,
  fetchPersistentVolumeAction,
} from '../ducks/app/volumes';
import {
  sortSelector,
  makeGetNodeFromUrl,
  makeGetPodsFromUrl,
  makeGetVolumesFromUrl,
  useRefreshEffect,
} from '../services/utils';
const NodeVolumes = lazy(() => import('./NodeVolumes'));
import {
  InformationListContainer,
  InformationSpan,
  InformationLabel,
  InformationValue,
  InformationMainValue,
} from '../components/InformationList';
import { STATUS_BOUND } from '../constants';
import { computeVolumeGlobalStatus } from '../services/NodeVolumesUtils';
import { intl } from '../translations/IntlGlobalProvider';

const NodeInformationContainer = styled.div`
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  height: 100%;
  padding: ${padding.small};

  .sc-tabs {
    flex-grow: 1;
    display: flex;
    flex-direction: column;
    margin: ${padding.smaller} ${padding.small} 0 ${padding.smaller};
  }

  .sc-tabs-item {
    /* We will change this logic later */
    flex-basis: auto;
    width: 100px;
  }

  .sc-tabs-item-content {
    display: flex;
    flex-direction: column;
    flex-grow: 1;
    padding: ${padding.smaller};
    background-color: ${(props) => props.theme.brand.primary};
  }
`;

const PodsContainer = styled.div`
  flex-grow: 1;
  margin-top: ${padding.base};
`;

const NodeInformation = (props) => {
  const history = useHistory();
  const match = useRouteMatch();
  const location = useLocation();
  const dispatch = useDispatch();
  useRefreshEffect(refreshNodesAction, stopRefreshNodesAction);

  useEffect(() => {
    dispatch(fetchPodsAction());
    dispatch(fetchVolumesAction());
    dispatch(fetchPersistentVolumeAction());
  }, [dispatch]);

  const [sortBy, setSortBy] = useState('name');
  const [sortDirection, setsortDirection] = useState('ASC');

  const node = useSelector((state) => makeGetNodeFromUrl(state, props));
  const theme = useSelector((state) => state.config.theme);
  const pods = useSelector((state) => makeGetPodsFromUrl(state, props));
  const volumes = useSelector((state) => makeGetVolumesFromUrl(state, props));
  const pVList = useSelector((state) => state.app.volumes.pVList);

  const columns = [
    {
      label: intl.translate('name'),
      dataKey: 'name',
      flexGrow: 1,
    },
    {
      label: intl.translate('status'),
      dataKey: 'status',
    },
    {
      label: intl.translate('namespace'),
      dataKey: 'namespace',
    },
    {
      label: intl.translate('start_time'),
      dataKey: 'startTime',
      renderer: (data) => (
        <span>
          <FormattedDate value={data} /> <FormattedTime value={data} />
        </span>
      ),
    },
    {
      label: intl.translate('restart'),
      dataKey: 'restartCount',
    },
  ];

  const podsSortedList = sortSelector(pods, sortBy, sortDirection);

  const onSort = ({ sortBy, sortDirection }) => {
    setSortBy(sortBy);
    setsortDirection(setsortDirection);
  };

  const NodeDetails = () => (
    <InformationListContainer>
      <InformationSpan>
        <InformationLabel>{intl.translate('name')}</InformationLabel>
        <InformationMainValue>{node.name}</InformationMainValue>
      </InformationSpan>
      <InformationSpan>
        <InformationLabel>{intl.translate('status')}</InformationLabel>
        <InformationValue>
          {intl.translate(node.status) || node.status}
        </InformationValue>
      </InformationSpan>
      <InformationSpan>
        <InformationLabel>{intl.translate('roles')}</InformationLabel>
        <InformationValue>{node.roles}</InformationValue>
      </InformationSpan>
      <InformationSpan>
        <InformationLabel>
          {intl.translate('metalk8s_version')}
        </InformationLabel>
        <InformationValue>{node.metalk8s_version}</InformationValue>
      </InformationSpan>
    </InformationListContainer>
  );

  const NodePods = () => (
    <>
      <PodsContainer>
        <Table
          list={podsSortedList}
          columns={columns}
          disableHeader={false}
          headerHeight={40}
          rowHeight={40}
          sortBy={sortBy}
          sortDirection={sortDirection}
          onSort={onSort}
          onRowClick={() => {}}
          noRowsRenderer={() => (
            <NoRowsRenderer content={intl.translate('no_data_available')} />
          )}
        />
      </PodsContainer>
    </>
  );

  const volumeData = volumes.map((volume) => {
    const volumePV = pVList.find(
      (pV) => pV.metadata.name === volume.metadata.name,
    );
    return {
      name: volume.metadata.name,
      status: computeVolumeGlobalStatus(volume.metadata.name, volume?.status),
      bound:
        volumePV?.status?.phase === STATUS_BOUND
          ? intl.translate('yes')
          : intl.translate('no'),
      storageCapacity:
        (volumePV &&
          volumePV.spec &&
          volumePV.spec.capacity &&
          volumePV.spec.capacity.storage) ||
        intl.translate('unknown'),
      storageClass: volume.spec.storageClassName,
      creationTime: volume.metadata.creationTimestamp,
    };
  });

  const isVolumesPage = location.pathname.endsWith('/volumes');
  const isPodsPage = location.pathname.endsWith('/pods');
  const items = [
    {
      selected: !isVolumesPage && !isPodsPage,
      title: intl.translate('details'),
      onClick: () => history.push(match.url),
    },
    {
      selected: isVolumesPage,
      title: intl.translate('volumes'),
      onClick: () => history.push(`${match.url}/volumes`),
    },
    {
      selected: isPodsPage,
      title: intl.translate('pods'),
      onClick: () => history.push(`${match.url}/pods`),
    },
  ];

  return (
    <NodeInformationContainer>
      <Tabs activeColor={theme.brand.secondary} items={items}>
        <Suspense fallback={<Loader />}>
        <Switch>
          <Route path={`${match.url}/pods`} component={NodePods} />
          <Route
            path={`${match.url}/volumes`}
            render={() => (
              <NodeVolumes nodeName={match.params.id} data={volumeData} />
            )}
          />
          <Route path="/" component={NodeDetails} />
        </Switch>
        </Suspense>
      </Tabs>
    </NodeInformationContainer>
  );
};

export default NodeInformation;
