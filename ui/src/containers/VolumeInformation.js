import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { withRouter, Link } from 'react-router-dom';
import { injectIntl } from 'react-intl';
import styled from 'styled-components';
import {
  padding,
  fontSize,
  fontWeight
} from '@scality/core-ui/dist/style/theme';
import { Breadcrumb } from '@scality/core-ui';
import { makeGetNodeFromUrl, makeGetVolumesFromUrl } from '../services/utils';
import { SPARCE_LOOP_DEVICE, RAW_BLOCK_DEVICE } from '../constants';
import {
  fetchVolumesAction,
  fetchPersistentVolumeAction,
  fetchStorageClassAction
} from '../ducks/app/volumes';
import { fetchNodesAction } from '../ducks/app/nodes';

const VolumeInformationContainer = styled.div`
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  height: 100%;
  padding: ${padding.base};

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
  }
`;

const BreadcrumbContainer = styled.div`
  margin-left: ${padding.small};
  .sc-breadcrumb {
    padding: ${padding.smaller};
  }
`;

const StyledLink = styled(Link)`
  font-size: ${fontSize.large};
`;

const BreadcrumbLabel = styled.span`
  font-size: ${fontSize.large};
`;

const DetailsContainer = styled.div`
  display: flex;
  flex-direction: column;
  margin: ${padding.base};
`;

const InformationSpan = styled.span`
  padding: 0 ${padding.larger} ${padding.small} 0;
`;

const InformationLabel = styled.span`
  font-size: ${fontSize.large};
  padding-right: ${padding.base};
  min-width: 150px;
  display: inline-block;
`;

const InformationValue = styled.span`
  font-size: ${fontSize.large};
`;

const InformationMainValue = styled(InformationValue)`
  font-weight: ${fontWeight.bold};
`;

const VolumeInformation = props => {
  const { intl, match } = props;
  const dispatch = useDispatch();
  useEffect(() => {
    dispatch(fetchNodesAction());
    dispatch(fetchVolumesAction());
    dispatch(fetchPersistentVolumeAction());
    dispatch(fetchStorageClassAction());
  }, []);
  const theme = useSelector(state => state.config.theme);
  const node = useSelector(state => makeGetNodeFromUrl(state, props));
  const volumes = useSelector(state => makeGetVolumesFromUrl(state, props));
  const pVList = useSelector(state => state.app.volumes.pVList);
  const storageClasses = useSelector(state => state.app.volumes.storageClass);
  const currentVolumeName = match.params.volumeName;
  const volume = volumes.find(v => v.metadata.name === currentVolumeName);
  const pV = pVList.find(pv => pv.metadata.name === currentVolumeName);
  const storageClass = storageClasses.find(
    SC =>
      SC.metadata.name ===
      (volume && volume.spec && volume.spec.storageClassName)
  );
  return (
    <VolumeInformationContainer>
      <BreadcrumbContainer>
        <Breadcrumb
          activeColor={theme.brand.secondary}
          paths={[
            <StyledLink to="/nodes">{intl.messages.nodes}</StyledLink>,
            <StyledLink to={`/nodes/${node.name}/volumes`}>
              {node.name}
            </StyledLink>,
            <BreadcrumbLabel>{match.params.volumeName}</BreadcrumbLabel>
          ]}
        />
      </BreadcrumbContainer>
      <DetailsContainer>
        <InformationSpan>
          <InformationLabel>{intl.messages.name}</InformationLabel>
          <InformationMainValue>
            {volume && volume.metadata && volume.metadata.name}
          </InformationMainValue>
        </InformationSpan>
        <InformationSpan>
          <InformationLabel>{intl.messages.status}</InformationLabel>
          <InformationMainValue>
            {pV && pV.status && pV.status.phase}
          </InformationMainValue>
        </InformationSpan>
        <InformationSpan>
          <InformationLabel>{intl.messages.type}</InformationLabel>
          <InformationMainValue>
            {volume && volume.spec && volume.spec.rawBlockDevice
              ? RAW_BLOCK_DEVICE
              : SPARCE_LOOP_DEVICE}
          </InformationMainValue>
        </InformationSpan>
        <InformationSpan>
          <InformationLabel>{'Bounded'}</InformationLabel>
          <InformationMainValue>
            {pV && pV.status && pV.status.phase === 'Bounded'
              ? 'True'
              : 'False'}
          </InformationMainValue>
        </InformationSpan>
        <InformationSpan>
          <InformationLabel>{intl.messages.storageClass}</InformationLabel>
          <InformationMainValue>
            {volume && volume.spec && volume.spec.storageClassName}
          </InformationMainValue>
        </InformationSpan>
        <InformationSpan>
          <InformationLabel>{'Path'}</InformationLabel>
          <InformationMainValue>
            {pV && pV.spec && pV.spec.local && pV.spec.local.path}
          </InformationMainValue>
        </InformationSpan>
        <InformationSpan>
          <InformationLabel>{'AccessMode'}</InformationLabel>
          <InformationMainValue>
            {pV && pV.spec && pV.spec.accessModes}
          </InformationMainValue>
        </InformationSpan>
        <InformationSpan>
          <InformationLabel>{'MountOption'}</InformationLabel>
          <InformationMainValue>
            {storageClass && storageClass.mountOptions}
          </InformationMainValue>
        </InformationSpan>
        <InformationSpan>
          <InformationLabel>{intl.messages.creationTime}</InformationLabel>
          <InformationMainValue>
            {volume && volume.metadata && volume.metadata.creationTimestamp}
          </InformationMainValue>
        </InformationSpan>
      </DetailsContainer>
    </VolumeInformationContainer>
  );
};

export default injectIntl(withRouter(VolumeInformation));
