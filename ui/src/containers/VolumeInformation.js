import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useRouteMatch } from 'react-router';
import { injectIntl, FormattedDate, FormattedTime } from 'react-intl';
import styled from 'styled-components';
import { padding } from '@scality/core-ui/dist/style/theme';
import { Breadcrumb, Table, Loader } from '@scality/core-ui';
import {
  makeGetNodeFromUrl,
  makeGetVolumesFromUrl,
  useRefreshEffect,
} from '../services/utils';
import {
  SPARSE_LOOP_DEVICE,
  RAW_BLOCK_DEVICE,
  STATUS_BOUND,
  STATUS_BANNER_ERROR,
  STATUS_FAILED,
} from '../constants';
import {
  fetchStorageClassAction,
  refreshVolumesAction,
  stopRefreshVolumesAction,
  refreshPersistentVolumesAction,
  stopRefreshPersistentVolumesAction,
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
  InformationMainValue,
} from '../components/InformationList';
import {
  computeVolumeGlobalStatus,
  volumeGetError,
} from '../services/NodeVolumesUtils';

const VolumeInformationListContainer = styled(InformationListContainer)`
  margin: ${padding.larger};
`;

const VolumeInformationContainer = styled.div`
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  padding: ${padding.base};
  .sc-banner {
    margin: ${padding.base} ${padding.larger} 0 ${padding.larger};
  }
`;
const InformationContainer = styled.div`
  display: flex;
  padding: ${padding.small} 0;
`;

const InformationValueSection = styled.div`
  height: 200px;
  min-width: 500px;
`;

const LoaderContainer = styled(Loader)`
  padding: ${padding.small} 0 0 ${padding.larger};
  visibility: ${props => {
    if (props.isLoading) {
      return `visible`;
    } else {
      return `hidden`;
    }
  }};
`;

const VolumeInformation = props => {
  const { intl } = props;
  const dispatch = useDispatch();
  const match = useRouteMatch();

  useRefreshEffect(refreshVolumesAction, stopRefreshVolumesAction);
  useRefreshEffect(
    refreshPersistentVolumesAction,
    stopRefreshPersistentVolumesAction,
  );
  useEffect(() => {
    dispatch(fetchNodesAction());
    dispatch(fetchStorageClassAction());
  }, [dispatch]);

  const theme = useSelector(state => state.config.theme);
  const node = useSelector(state => makeGetNodeFromUrl(state, props));
  const volumes = useSelector(state => makeGetVolumesFromUrl(state, props));
  const pVList = useSelector(state => state.app.volumes.pVList);
  const storageClasses = useSelector(state => state.app.volumes.storageClass);

  const isLoading = useSelector(state => state.app.volumes.isLoading);

  const currentVolumeName = match.params.volumeName;
  const volume = volumes.find(
    volume => volume.metadata.name === currentVolumeName,
  );
  const pV = pVList.find(pv => pv.metadata.name === currentVolumeName);
  const storageClass = storageClasses.find(
    SC => SC.metadata.name === volume?.spec?.storageClassName,
  );
  const volumeStatus = computeVolumeGlobalStatus(
    volume?.metadata?.name,
    volume?.status,
  );
  const [errorCode, errorMessage] = volumeGetError(volume?.status);
  const columns = [
    {
      label: intl.messages.name,
      dataKey: 'name',
    },
    {
      label: intl.messages.value,
      dataKey: 'value',
    },
  ];
  const labels = pV?.metadata?.labels //persistent Volume labels
    ? Object.keys(pV.metadata.labels).map(key => {
        return {
          name: key,
          value: pV.metadata.labels[key],
        };
      })
    : [];
  return (
    <VolumeInformationContainer>
      <BreadcrumbContainer>
        <Breadcrumb
          activeColor={theme.brand.secondary}
          paths={[
            <StyledLink to="/nodes">{intl.messages.nodes}</StyledLink>,
            <StyledLink to={`/nodes/${node.name}`} title={node.name}>
              {node.name}
            </StyledLink>,
            <StyledLink
              to={`/nodes/${node.name}/volumes`}
              title={intl.messages.volumes}
            >
              {intl.messages.volumes}
            </StyledLink>,
            <BreadcrumbLabel title={match.params.volumeName}>
              {match.params.volumeName}
            </BreadcrumbLabel>,
          ]}
        />
      </BreadcrumbContainer>

      {volumeStatus === STATUS_FAILED ? (
        <Banner
          type={STATUS_BANNER_ERROR}
          icon={<i className="fas fa-exclamation-triangle" />}
          title={
            errorCode === 'CreationError'
              ? intl.messages.failed_to_create_volume
              : intl.messages.error
          }
          messages={[errorMessage]}
        />
      ) : null}

      {<LoaderContainer isLoading={isLoading} size="small" />}

      <VolumeInformationListContainer>
        <InformationSpan>
          <InformationLabel>{intl.messages.name}</InformationLabel>
          <InformationMainValue>{volume?.metadata?.name}</InformationMainValue>
        </InformationSpan>
        <InformationSpan>
          <InformationLabel>{intl.messages.status}</InformationLabel>
          <InformationValue>
            {volumeStatus ?? intl.messages.unknown}
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
        {!!labels?.length && (
          <InformationContainer>
            <InformationLabel>{intl.messages.labels}</InformationLabel>
            <InformationValueSection>
              <Table
                list={labels}
                columns={columns}
                disableHeader={false}
                headerHeight={40}
                rowHeight={40}
              />
            </InformationValueSection>
          </InformationContainer>
        )}
      </VolumeInformationListContainer>
    </VolumeInformationContainer>
  );
};

export default injectIntl(VolumeInformation);
