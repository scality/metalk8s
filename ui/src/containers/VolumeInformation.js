import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useRouteMatch } from 'react-router';
import { FormattedDate, FormattedTime } from 'react-intl';
import styled from 'styled-components';
import { padding } from '@scality/core-ui/dist/style/theme';
import { Table, Loader, Banner } from '@scality/core-ui';
import { makeGetVolumesFromUrl, useRefreshEffect } from '../services/utils';
import {
  SPARSE_LOOP_DEVICE,
  RAW_BLOCK_DEVICE,
  STATUS_BOUND,
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
import { useIntl } from 'react-intl';

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
  visibility: ${(props) => {
    if (props.isLoading) {
      return `visible`;
    } else {
      return `hidden`;
    }
  }};
`;

// Abort page
const VolumeInformation = (props) => {
  const dispatch = useDispatch();
  const match = useRouteMatch();
  const intl = useIntl();
  useRefreshEffect(refreshVolumesAction, stopRefreshVolumesAction);
  useRefreshEffect(
    refreshPersistentVolumesAction,
    stopRefreshPersistentVolumesAction,
  );
  useEffect(() => {
    dispatch(fetchNodesAction());
    dispatch(fetchStorageClassAction());
  }, [dispatch]);

  const volumes = useSelector((state) => makeGetVolumesFromUrl(state, props));
  const pVList = useSelector((state) => state.app.volumes.pVList);
  const storageClasses = useSelector((state) => state.app.volumes.storageClass);

  const isLoading = useSelector((state) => state.app.volumes.isLoading);

  const currentVolumeName = match.params.volumeName;
  const volume = volumes.find(
    (volume) => volume.metadata.name === currentVolumeName,
  );
  const pV = pVList.find((pv) => pv.metadata.name === currentVolumeName);
  const storageClass = storageClasses.find(
    (SC) => SC.metadata.name === volume?.spec?.storageClassName,
  );
  const volumeStatus = computeVolumeGlobalStatus(
    volume?.metadata?.name,
    volume?.status,
  );
  const [errorCode, errorMessage] = volumeGetError(volume?.status);
  const columns = [
    {
      label: intl.formatMessage({ id: 'name' }),
      dataKey: 'name',
    },
    {
      label: intl.formatMessage({ id: 'value' }),
      dataKey: 'value',
    },
  ];
  const labels = pV?.metadata?.labels //persistent Volume labels
    ? Object.keys(pV.metadata.labels).map((key) => {
        return {
          name: key,
          value: pV.metadata.labels[key],
        };
      })
    : [];
  return (
    <VolumeInformationContainer>
      {volumeStatus === STATUS_FAILED ? (
        <Banner
          variant="danger"
          icon={<i className="fas fa-exclamation-triangle" />}
          title={
            errorCode === 'CreationError'
              ? intl.formatMessage({ id: 'failed_to_create_volume' })
              : intl.formatMessage({ id: 'error' })
          }
        >
          {errorMessage}
        </Banner>
      ) : null}

      {<LoaderContainer isLoading={isLoading} size="small" />}

      <VolumeInformationListContainer>
        <InformationSpan>
          <InformationLabel>
            {intl.formatMessage({ id: 'name' })}
          </InformationLabel>
          <InformationMainValue>{volume?.metadata?.name}</InformationMainValue>
        </InformationSpan>
        <InformationSpan>
          <InformationLabel>
            {intl.formatMessage({ id: 'status' })}
          </InformationLabel>
          <InformationValue>
            {volumeStatus ?? intl.formatMessage({ id: 'unknown' })}
          </InformationValue>
        </InformationSpan>
        <InformationSpan>
          <InformationLabel>
            {intl.formatMessage({ id: 'size' })}
          </InformationLabel>
          <InformationValue>
            {pV?.spec?.capacity?.storage ??
              intl.formatMessage({ id: 'unknown' })}
          </InformationValue>
        </InformationSpan>
        <InformationSpan>
          <InformationLabel>
            {intl.formatMessage({ id: 'type' })}
          </InformationLabel>
          <InformationValue>
            {volume?.spec?.rawBlockDevice
              ? RAW_BLOCK_DEVICE
              : SPARSE_LOOP_DEVICE}
          </InformationValue>
        </InformationSpan>
        <InformationSpan>
          <InformationLabel>
            {intl.formatMessage({ id: 'bound' })}
          </InformationLabel>
          <InformationValue>
            {pV?.status?.phase === STATUS_BOUND
              ? intl.formatMessage({ id: 'yes' })
              : intl.formatMessage({ id: 'no' })}
          </InformationValue>
        </InformationSpan>
        <InformationSpan>
          <InformationLabel>
            {intl.formatMessage({ id: 'storageClass' })}
          </InformationLabel>
          <InformationValue>{volume?.spec?.storageClassName}</InformationValue>
        </InformationSpan>
        <InformationSpan>
          <InformationLabel>
            {intl.formatMessage({ id: 'path' })}
          </InformationLabel>
          <InformationValue>
            {volume?.spec?.rawBlockDevice?.devicePath ??
              intl.formatMessage({ id: 'not_applicable' })}
          </InformationValue>
        </InformationSpan>
        <InformationSpan>
          <InformationLabel>
            {intl.formatMessage({ id: 'access_mode' })}
          </InformationLabel>
          intl.formatMessage
          <InformationValue>
            {pV?.spec?.accessModes ?? intl.formatMessage({ id: 'unknown' })}
          </InformationValue>
        </InformationSpan>
        <InformationSpan>
          <InformationLabel>
            {intl.formatMessage({ id: 'mount_option' })}
          </InformationLabel>
          <InformationValue>
            {storageClass?.mountOptions.join(', ')}
          </InformationValue>
        </InformationSpan>
        <InformationSpan>
          <InformationLabel>
            {intl.formatMessage({ id: 'creationTime' })}
          </InformationLabel>
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
            <InformationLabel>
              {intl.formatMessage({ id: 'labels' })}
            </InformationLabel>
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

export default VolumeInformation;
