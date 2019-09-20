import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { withRouter } from 'react-router-dom';
import { injectIntl, FormattedDate, FormattedTime } from 'react-intl';
import styled from 'styled-components';
import { padding, fontSize } from '@scality/core-ui/dist/style/theme';
import { Breadcrumb } from '@scality/core-ui';
import { makeGetNodeFromUrl, makeGetVolumesFromUrl } from '../services/utils';
import {
  SPARSE_LOOP_DEVICE,
  RAW_BLOCK_DEVICE,
  STATUS_BOUND,
  STATUS_BANNER_ERROR,
  STATUS_FAILED,
} from '../constants';
import {
  fetchVolumesAction,
  fetchPersistentVolumeAction,
  fetchStorageClassAction,
} from '../ducks/app/volumes';
import { fetchNodesAction } from '../ducks/app/nodes';
import {
  BreadcrumbContainer,
  BreadcrumbLabel,
  StyledLink,
} from '../components/BreadcrumbStyle';
import Banner from '../components/Banner';
import {
  InformationListContainer,
  InformationSpan,
  InformationLabel,
  InformationValue,
} from '../components/InformationList';

const VolumeInformationListContainer = styled(InformationListContainer)`
  margin-left: ${padding.larger};
`;

const VolumeInformationContainer = styled.div`
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  padding: ${padding.base};
  width: 750px;
`;

const VolumeInformationTitle = styled.div`
  font-size: ${fontSize.larger};
  margin-left: ${padding.larger};
`;

const VolumeInformation = props => {
  const { intl, match } = props;
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(fetchNodesAction());
    dispatch(fetchVolumesAction());
    dispatch(fetchPersistentVolumeAction());
    dispatch(fetchStorageClassAction());
  }, [dispatch]);

  const theme = useSelector(state => state.config.theme);
  const node = useSelector(state => makeGetNodeFromUrl(state, props));
  const volumes = useSelector(state => makeGetVolumesFromUrl(state, props));
  const pVList = useSelector(state => state.app.volumes.pVList);
  const storageClasses = useSelector(state => state.app.volumes.storageClass);
  const currentVolumeName = match.params.volumeName;
  const volume = volumes.find(
    volume => volume.metadata.name === currentVolumeName,
  );
  const pV = pVList.find(pv => pv.metadata.name === currentVolumeName);
  const storageClass = storageClasses.find(
    SC => SC.metadata.name === volume?.spec?.storageClassName,
  );

  return (
    <VolumeInformationContainer>
      <BreadcrumbContainer>
        <Breadcrumb
          activeColor={theme.brand.secondary}
          paths={[
            <StyledLink to="/nodes">{intl.messages.nodes}</StyledLink>,
            <StyledLink to={`/nodes/${node.name}/volumes`} title={node.name}>
              {node.name}
            </StyledLink>,
            <BreadcrumbLabel title={match.params.volumeName}>
              {match.params.volumeName}
            </BreadcrumbLabel>,
          ]}
        />
      </BreadcrumbContainer>
      <VolumeInformationTitle>
        {intl.messages.detailed_information}
      </VolumeInformationTitle>

      {volume?.status?.phase === STATUS_FAILED ? (
        <Banner
          type={STATUS_BANNER_ERROR}
          icon={<i className="fas fa-exclamation-triangle" />}
          title={
            volume?.status?.errorCode === 'CreationError'
              ? intl.messages.failed_to_create_volume
              : intl.messages.error
          }
          messages={[volume?.status?.errorMessage]}
        />
      ) : null}

      <VolumeInformationListContainer>
        <InformationSpan>
          <InformationLabel>{intl.messages.name}</InformationLabel>
          <InformationValue>{volume?.metadata?.name}</InformationValue>
        </InformationSpan>
        <InformationSpan>
          <InformationLabel>{intl.messages.status}</InformationLabel>
          <InformationValue>
            {volume?.status?.phase ?? intl.messages.unknown}
          </InformationValue>
        </InformationSpan>
        <InformationSpan>
          <InformationLabel>{intl.messages.size}</InformationLabel>
          <InformationValue>
            {pV?.spec?.capacity?.storage ?? intl.messages.unknown}
          </InformationValue>
        </InformationSpan>
        <InformationSpan>
          <InformationLabel>{intl.messages.type}</InformationLabel>
          <InformationValue>
            {volume?.spec?.rawBlockDevice
              ? RAW_BLOCK_DEVICE
              : SPARSE_LOOP_DEVICE}
          </InformationValue>
        </InformationSpan>
        <InformationSpan>
          <InformationLabel>{intl.messages.bound}</InformationLabel>
          <InformationValue>
            {pV?.status?.phase === STATUS_BOUND
              ? intl.messages.yes
              : intl.messages.no}
          </InformationValue>
        </InformationSpan>
        <InformationSpan>
          <InformationLabel>{intl.messages.storageClass}</InformationLabel>
          <InformationValue>{volume?.spec?.storageClassName}</InformationValue>
        </InformationSpan>
        <InformationSpan>
          <InformationLabel>{intl.messages.path}</InformationLabel>
          <InformationValue>
            {volume?.spec?.rawBlockDevice?.devicePath ??
              intl.messages.not_applicable}
          </InformationValue>
        </InformationSpan>
        <InformationSpan>
          <InformationLabel>{intl.messages.access_mode}</InformationLabel>
          <InformationValue>
            {pV?.spec?.accessModes ?? intl.messages.unknown}
          </InformationValue>
        </InformationSpan>
        <InformationSpan>
          <InformationLabel>{intl.messages.mount_option}</InformationLabel>
          <InformationValue>
            {storageClass?.mountOptions.join(', ')}
          </InformationValue>
        </InformationSpan>
        <InformationSpan>
          <InformationLabel>{intl.messages.creationTime}</InformationLabel>
          {volume?.metadata?.creationTimestamp ? (
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
