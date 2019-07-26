import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { withRouter } from 'react-router-dom';
import {
  injectIntl,
  FormattedDate,
  FormattedTime,
  intlShape
} from 'react-intl';
import styled from 'styled-components';
import {
  padding,
  fontSize,
  fontWeight
} from '@scality/core-ui/dist/style/theme';
import { Breadcrumb } from '@scality/core-ui';
import { makeGetNodeFromUrl, makeGetVolumesFromUrl } from '../services/utils';
import {
  SPARCE_LOOP_DEVICE,
  RAW_BLOCK_DEVICE,
  STATUS_BOUND,
  STATUS_BOUND_TRUE,
  STATUS_BOUND_FALSE
} from '../constants';
import {
  fetchVolumesAction,
  fetchPersistentVolumeAction,
  fetchStorageClassAction
} from '../ducks/app/volumes';
import { fetchNodesAction } from '../ducks/app/nodes';
import {
  BreadcrumbContainer,
  BreadcrumbLabel,
  StyledLink
} from '../components/BreadcrumbStyle';

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

const DetailsContainer = styled.div`
  display: flex;
  flex-direction: column;
  margin: ${padding.base};
  margin-left: ${padding.larger};
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
  const volume = volumes.find(
    volume => volume.metadata.name === currentVolumeName
  );
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
          <InformationValue>
            {volume && volume.metadata && volume.metadata.name}
          </InformationValue>
        </InformationSpan>
        <InformationSpan>
          <InformationLabel>{intl.messages.status}</InformationLabel>
          <InformationValue>
            {(volume && volume.status && volume.status.phase) ||
              intl.messages.unknown}
          </InformationValue>
        </InformationSpan>
        <InformationSpan>
          <InformationLabel>{intl.messages.size}</InformationLabel>
          <InformationValue>
            {pV && pV.spec && pV.spec.capacity && pV.spec.capacity.storage}
          </InformationValue>
        </InformationSpan>
        <InformationSpan>
          <InformationLabel>{intl.messages.type}</InformationLabel>
          <InformationValue>
            {volume && volume.spec && volume.spec.rawBlockDevice
              ? RAW_BLOCK_DEVICE
              : SPARCE_LOOP_DEVICE}
          </InformationValue>
        </InformationSpan>
        <InformationSpan>
          <InformationLabel>{intl.messages.bound}</InformationLabel>
          <InformationValue>
            {pV && pV.status && pV.status.phase === STATUS_BOUND
              ? STATUS_BOUND_TRUE
              : STATUS_BOUND_FALSE}
          </InformationValue>
        </InformationSpan>
        <InformationSpan>
          <InformationLabel>{intl.messages.storageClass}</InformationLabel>
          <InformationValue>
            {volume && volume.spec && volume.spec.storageClassName}
          </InformationValue>
        </InformationSpan>
        <InformationSpan>
          <InformationLabel>{intl.messages.path}</InformationLabel>
          <InformationValue>
            {pV && pV.spec && pV.spec.local && pV.spec.local.path}
          </InformationValue>
        </InformationSpan>
        <InformationSpan>
          <InformationLabel>{intl.messages.access_mode}</InformationLabel>
          <InformationValue>
            {pV && pV.spec && pV.spec.accessModes}
          </InformationValue>
        </InformationSpan>
        <InformationSpan>
          <InformationLabel>{intl.messages.mount_option}</InformationLabel>
          <InformationValue>
            {storageClass && storageClass.mountOptions.join(', ')}
          </InformationValue>
        </InformationSpan>
        <InformationSpan>
          <InformationLabel>{intl.messages.creationTime}</InformationLabel>
          {volume && volume.metadata && volume.metadata.creationTimestamp ? (
            <InformationValue>
              <FormattedDate value={volume.metadata.creationTimestamp} />
              <FormattedTime
                hour="2-digit"
                minute="2-digit"
                second="2-digit"
                value={volume.metadata.creationTimestamp}
              />
            </InformationValue>
          ) : (
            ''
          )}
        </InformationSpan>
      </DetailsContainer>
    </VolumeInformationContainer>
  );
};

export default injectIntl(withRouter(VolumeInformation));
