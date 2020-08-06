import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import styled from 'styled-components';
import { Breadcrumb } from '@scality/core-ui';
import { padding } from '@scality/core-ui/dist/style/theme';
import VolumeContent from './VolumePageContent';
import { fetchPodsAction } from '../ducks/app/pods';
import { refreshNodesAction, stopRefreshNodesAction } from '../ducks/app/nodes';
import {
  makeGetNodeFromUrl,
  makeGetPodsFromUrl,
  makeGetVolumesFromUrl,
  useRefreshEffect,
} from '../services/utils';
import {
  refreshVolumesAction,
  stopRefreshVolumesAction,
  refreshPersistentVolumesAction,
  stopRefreshPersistentVolumesAction,
  fetchPersistentVolumeClaimAction,
} from '../ducks/app/volumes';
import {
  refreshVolumeStatsAction,
  refreshAlertsAction,
  stopRefreshAlertsAction,
} from '../ducks/app/monitoring';
import {
  BreadcrumbContainer,
  BreadcrumbLabel,
  StyledLink,
} from '../components/BreadcrumbStyle';
import { getVolumeListData } from '../services/NodeVolumesUtils';
import { intl } from '../translations/IntlGlobalProvider';

// should be extracted to the common style, need to change the position of other's breadcrumb
const PageContainer = styled.div`
  display: flex;
  box-sizing: border-box;
  height: 100%;
  flex-wrap: wrap;
  padding: ${padding.small};
`;

// <VolumePage> component fetchs all the data used by volume page from redux store.
// <VolumeContent> component extracts the current volume name from URL and sends volume specific data to sub components.
const VolumePage = (props) => {
  const dispatch = useDispatch();

  useRefreshEffect(refreshNodesAction, stopRefreshNodesAction);
  useRefreshEffect(refreshVolumesAction, stopRefreshVolumesAction);
  useRefreshEffect(
    refreshPersistentVolumesAction,
    stopRefreshPersistentVolumesAction,
  );
  useEffect(() => {
    dispatch(fetchPodsAction());
    dispatch(refreshVolumeStatsAction());
    dispatch(fetchPersistentVolumeClaimAction());
  }, [dispatch]);
  useEffect(() => {
    dispatch(refreshAlertsAction());
    return () => dispatch(stopRefreshAlertsAction());
  }, [dispatch]);

  const theme = useSelector((state) => state.config.theme);
  const pods = useSelector((state) => makeGetPodsFromUrl(state, props));
  const node = useSelector((state) => makeGetNodeFromUrl(state, props));
  const volumes = useSelector((state) => makeGetVolumesFromUrl(state, props));
  const pVList = useSelector((state) => state.app.volumes.pVList);
  const alerts = useSelector((state) => state.app.monitoring.alert);
  const volumeStats = useSelector((state) => state.app.monitoring.volumeStats);

  const volumeListData = useSelector((state) =>
    getVolumeListData(state, props),
  );

  return (
    <PageContainer>
      <BreadcrumbContainer>
        {node.name !== undefined ? (
          <Breadcrumb
            activeColor={theme.brand.secondary}
            paths={[
              <BreadcrumbLabel title={intl.translate('platform')}>
                {intl.translate('platform')}
              </BreadcrumbLabel>,
              <StyledLink to="/nodes">{intl.translate('nodes')}</StyledLink>,
              <StyledLink to={`/nodes/${node.name}`} title={node.name}>
                {node.name}
              </StyledLink>,
              <BreadcrumbLabel title={intl.translate('volumes')}>
                {intl.translate('volumes')}
              </BreadcrumbLabel>,
            ]}
          />
        ) : (
          <Breadcrumb
            activeColor={theme.brand.secondary}
            paths={[
              <BreadcrumbLabel title={intl.translate('platform')}>
                {intl.translate('platform')}
              </BreadcrumbLabel>,
              <BreadcrumbLabel title={intl.translate('volumes')}>
                {intl.translate('volumes')}
              </BreadcrumbLabel>,
            ]}
          />
        )}
      </BreadcrumbContainer>
      <VolumeContent
        volumes={volumes}
        volumeListData={volumeListData}
        node={node}
        pVList={pVList}
        pods={pods}
        alerts={alerts}
        volumeStats={volumeStats}
      ></VolumeContent>
    </PageContainer>
  );
};

export default VolumePage;
