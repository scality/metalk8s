import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { withRouter } from 'react-router-dom';
import { injectIntl, FormattedDate, FormattedTime } from 'react-intl';
import styled from 'styled-components';
import { padding } from '@scality/core-ui/dist/style/theme';
import { Breadcrumb } from '@scality/core-ui';
import { makeGetNodeFromUrl, makeGetVolumesFromUrl } from '../services/utils';
import {
  SPARCE_LOOP_DEVICE,
  RAW_BLOCK_DEVICE,
  STATUS_BOUND
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
import {
  InformationListContainer,
  InformationSpan,
  InformationLabel,
  InformationValue
} from '../components/InformationList';

const VolumeInformationListContainer = styled(InformationListContainer)`
  margin-left: ${padding.larger};
`;

const VolumeInformationContainer = styled.div`
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  padding: ${padding.base};
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
      <VolumeInformationListContainer>
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
              ? intl.messages.yes
              : intl.messages.no}
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
              <FormattedDate value={volume.metadata.creationTimestamp} />{' '}
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
      </VolumeInformationListContainer>
    </VolumeInformationContainer>
  );
};

export default injectIntl(withRouter(VolumeInformation));
