import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { useHistory } from 'react-router';
import { FormattedDate, FormattedTime } from 'react-intl';
import styled, { useTheme } from 'styled-components';
import {
  fontSize,
  padding,
  fontWeight,
} from '@scality/core-ui/dist/style/theme';
import CircleStatus from './CircleStatus';
import ActiveAlertsCounter from './ActiveAlertsCounter';
import { isVolumeDeletable } from '../services/NodeVolumesUtils';
import { deleteVolumeAction } from '../ducks/app/volumes';
import {
  VOLUME_CONDITION_LINK,
  STATUS_CRITICAL,
  STATUS_WARNING,
  LVM_LOGICAL_VOLUME,
} from '../constants';
import { Banner, Link, Modal, ProgressBar } from '@scality/core-ui';
import { Button } from '@scality/core-ui/dist/next';
import { useIntl } from 'react-intl';
import {
  VolumeTab,
  OverviewInformationLabel,
  OverviewInformationSpan,
  OverviewInformationValue,
  OverviewClickableInformationValue,
  OverviewResourceName,
  ActiveAlertTitle,
  ActiveAlertWrapper,
} from './style/CommonLayoutStyle';
import { formatSizeForDisplay } from '../services/utils';
import { RenderNoDataAvailable } from '../containers/NodePageMetricsTab';
import { Icon } from '@scality/core-ui';
const VolumeDetailCardContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
`;
const VolumeTitleSection = styled.div`
  color: ${(props) => props.theme.textPrimary};
  padding: ${padding.large} ${padding.base} ${padding.larger} ${padding.large};
  display: flex;
  justify-content: space-between;
`;
const VolumeGraph = styled.div`
  display: flex;
  flex-direction: column;
  margin-left: 2%;
  padding-right: ${padding.larger};
`;
const VolumeUsage = styled.div`
  min-height: 94px;
  margin: ${padding.large} ${padding.small} ${padding.large} 0;
  padding: 0 ${padding.base} 0 0;
`;
const VolumeSectionTitle = styled.div`
  color: ${(props) => props.theme.textPrimary};
  font-size: ${fontSize.base};
  font-weight: ${fontWeight.bold};
  padding: 0 0 ${padding.base} 0;
`;
const ProgressBarContainer = styled.div`
  margin: ${padding.small};
`;
const NotificationButtonGroup = styled.div`
  display: flex;
  justify-content: flex-end;
`;
const ModalBody = styled.div`
  padding-bottom: ${padding.base};
`;
const CancelButton = styled(Button)`
  margin-right: ${padding.small};
`;
const LabelName = styled.span`
  font-size: ${fontSize.small};
  color: ${(props) => props.theme.textPrimary};
  padding-right: ${padding.base};
`;
const LabelValue = styled.span`
  font-size: ${fontSize.small};
  color: ${(props) => props.theme.textPrimary};
`;

const VolumeDetailCard = (props) => {
  const {
    name,
    nodeName,
    status,
    storageClassName,
    creationTimestamp,
    volumeType,
    usedPodName,
    devicePath,
    vgName,
    volumeUsagePercentage,
    volumeUsageBytes,
    storageCapacity,
    condition,
    volumeListData,
    pVList,
    health,
    alertlist,
  } = props;
  const dispatch = useDispatch();
  const history = useHistory();
  const location = useLocation();
  const intl = useIntl();
  const query = new URLSearchParams(location.search);
  const theme = useTheme();
  const isVolumeUsageRetrievable = volumeUsagePercentage !== undefined;

  const deleteVolume = (deleteVolumeName) =>
    dispatch(deleteVolumeAction(deleteVolumeName));

  const [isDeleteConfirmationModalOpen, setisDeleteConfirmationModalOpen] =
    useState(false);

  // Confirm the deletion
  const onClickDeleteButton = (deleteVolumeName, nodeName) => {
    const isAddNodefilter = query.has('node');
    deleteVolume(deleteVolumeName);
    setisDeleteConfirmationModalOpen(false);
    let hightvolumeName;

    if (volumeListData[0]?.name === deleteVolumeName) {
      // delete the first volume
      hightvolumeName = volumeListData[1]?.name;
    } else {
      // after the deletion, automatically select the first volume
      hightvolumeName = volumeListData[0]?.name;
    }

    if (isAddNodefilter && hightvolumeName) {
      history.push(`/volumes/${hightvolumeName}/overview?node=${nodeName}`);
    } else if (!isAddNodefilter && hightvolumeName) {
      history.push(`/volumes/${hightvolumeName}/overview`);
    } else if (isAddNodefilter && !hightvolumeName) {
      history.push(`/volumes/?node=${nodeName}`);
    } else {
      history.push('/volumes');
    }
  };

  const onClickNodeName = () => {
    history.push(`/nodes/${nodeName}/overview`);
  };

  const onClickCancelButton = () => {
    setisDeleteConfirmationModalOpen(false);
  };

  const isEnableClick = isVolumeDeletable(status, name, pVList);
  const pV = pVList.find((pv) => pv.metadata.name === name);
  const labels = pV?.metadata?.labels //persistent Volume labels
    ? Object.keys(pV.metadata.labels).map((key) => {
        return {
          name: key,
          value: pV.metadata.labels[key],
        };
      })
    : [];
  return (
    <VolumeTab>
      <VolumeTitleSection data-cy="volume_detail_card_name">
        <div>
          <CircleStatus className="fas fa-circle" status={health} />
          <OverviewResourceName>{name}</OverviewResourceName>
        </div>
        <Button
          variant="danger"
          style={{ width: 'max-content' }}
          icon={<Icon size="sm" name="Delete" />}
          label={intl.formatMessage({
            id: 'delete_volume',
          })}
          onClick={(e) => {
            e.stopPropagation();
            setisDeleteConfirmationModalOpen(true);
          }}
          disabled={!isEnableClick}
          data-cy="delete_volume_button"
        />
      </VolumeTitleSection>
      {/*TODO: To be replaced by new <Box></Box> component*/}
      {!isVolumeUsageRetrievable && (
        <div
          style={{
            width: '48rem',
            padding: '0 0 2rem 20px',
          }}
        >
          <Banner
            variant="warning"
            icon={<Icon name="Exclamation-triangle" />}
            title={intl.formatMessage({
              id: 'monitoring_information_unavailable',
            })}
          >
            {intl.formatMessage({
              id: 'some_data_not_retrieved',
            })}
          </Banner>
        </div>
      )}

      <VolumeDetailCardContainer>
        <div>
          <OverviewInformationSpan>
            <OverviewInformationLabel>
              {intl.formatMessage({
                id: 'node',
              })}
            </OverviewInformationLabel>
            <Link onClick={onClickNodeName}>{nodeName}</Link>
          </OverviewInformationSpan>
          <OverviewInformationSpan>
            <OverviewInformationLabel>
              {intl.formatMessage({
                id: 'size',
              })}
            </OverviewInformationLabel>
            <OverviewInformationValue data-cy="volume_size_value">
              {storageCapacity ||
                intl.formatMessage({
                  id: 'unknown',
                })}
            </OverviewInformationValue>
          </OverviewInformationSpan>
          <OverviewInformationSpan>
            <OverviewInformationLabel>
              {intl.formatMessage({
                id: 'status',
              })}
            </OverviewInformationLabel>
            <OverviewInformationValue data-cy="volume_status_value">
              {status}
            </OverviewInformationValue>
          </OverviewInformationSpan>
          <OverviewInformationSpan>
            <OverviewInformationLabel>
              {intl.formatMessage({
                id: 'storageClass',
              })}
            </OverviewInformationLabel>
            <OverviewInformationValue>
              {storageClassName}
            </OverviewInformationValue>
          </OverviewInformationSpan>
          <OverviewInformationSpan>
            <OverviewInformationLabel>
              {intl.formatMessage({
                id: 'creationTime',
              })}
            </OverviewInformationLabel>
            {creationTimestamp ? (
              <OverviewInformationValue>
                <FormattedDate
                  value={creationTimestamp}
                  year="numeric"
                  month="short"
                  day="2-digit"
                />{' '}
                <FormattedTime
                  hour="2-digit"
                  minute="2-digit"
                  second="2-digit"
                  value={creationTimestamp}
                />
              </OverviewInformationValue>
            ) : (
              ''
            )}
          </OverviewInformationSpan>
          <OverviewInformationSpan>
            <OverviewInformationLabel>
              {intl.formatMessage({
                id: 'volume_type',
              })}
            </OverviewInformationLabel>
            <OverviewInformationValue>{volumeType}</OverviewInformationValue>
          </OverviewInformationSpan>
          <OverviewInformationSpan>
            <OverviewInformationLabel>
              {intl.formatMessage({
                id: 'used_by',
              })}
            </OverviewInformationLabel>
            <OverviewInformationValue>{usedPodName}</OverviewInformationValue>
          </OverviewInformationSpan>
          <OverviewInformationSpan>
            {volumeType !== LVM_LOGICAL_VOLUME ? (
              <>
                <OverviewInformationLabel data-cy="backend_disk_label">
                  {intl.formatMessage({
                    id: 'backend_disk',
                  })}
                </OverviewInformationLabel>
                <OverviewInformationValue data-cy="backend_disk_value">
                  {devicePath}
                </OverviewInformationValue>
              </>
            ) : (
              <>
                <OverviewInformationLabel data-cy="vg_name_label">
                  VG Name
                </OverviewInformationLabel>
                <OverviewInformationValue data-cy="vg_name_value">
                  {vgName}
                </OverviewInformationValue>
              </>
            )}
          </OverviewInformationSpan>
          <OverviewInformationSpan>
            <OverviewInformationLabel>
              {intl.formatMessage({
                id: 'labels',
              })}
            </OverviewInformationLabel>
            <OverviewInformationValue>
              {labels?.map((label) => {
                return (
                  <div key={label.name}>
                    <LabelName data-cy="volume_label_name">
                      {label.name}
                    </LabelName>
                    <LabelValue data-cy="volume_label_value">
                      {label.value}
                    </LabelValue>
                  </div>
                );
              })}
            </OverviewInformationValue>
          </OverviewInformationSpan>
        </div>

        <VolumeGraph>
          {alertlist && (
            <ActiveAlertWrapper>
              <ActiveAlertTitle>
                {intl.formatMessage({
                  id: 'active_alerts',
                })}
              </ActiveAlertTitle>
              <ActiveAlertsCounter
                criticalCounter={
                  alertlist?.filter(
                    (item) => item?.labels?.severity === STATUS_CRITICAL,
                  ).length
                }
                warningCounter={
                  alertlist?.filter(
                    (item) => item?.labels?.severity === STATUS_WARNING,
                  ).length
                }
              />
            </ActiveAlertWrapper>
          )}
          <VolumeUsage>
            <VolumeSectionTitle>
              {intl.formatMessage({
                id: 'usage',
              })}
            </VolumeSectionTitle>
            {!isVolumeUsageRetrievable && <RenderNoDataAvailable />}
            {isVolumeUsageRetrievable &&
              condition === VOLUME_CONDITION_LINK && (
                <ProgressBarContainer>
                  <ProgressBar
                    size="large"
                    percentage={volumeUsagePercentage}
                    topRightLabel={`${volumeUsagePercentage}%`}
                    bottomLeftLabel={`${volumeUsageBytes} USED`}
                    bottomRightLabel={`${formatSizeForDisplay(
                      storageCapacity,
                    )} TOTAL`}
                    // @ts-expect-error - FIXME when you are working on it
                    color={theme.infoSecondary}
                    // @ts-expect-error - FIXME when you are working on it
                    backgroundColor={theme.buttonSecondary}
                  />
                </ProgressBarContainer>
              )}
          </VolumeUsage>
        </VolumeGraph>
        <Modal
          close={() => setisDeleteConfirmationModalOpen(false)}
          isOpen={isDeleteConfirmationModalOpen}
          title={intl.formatMessage({
            id: 'delete_volume',
          })}
          footer={
            <NotificationButtonGroup>
              <CancelButton
                variant="outline"
                label={intl.formatMessage({
                  id: 'cancel',
                })}
                onClick={onClickCancelButton}
              />
              <Button
                variant="danger"
                label={intl.formatMessage({
                  id: 'delete',
                })}
                onClick={() => {
                  onClickDeleteButton(name, nodeName);
                }}
                data-cy="confirm_deletion_button"
              />
            </NotificationButtonGroup>
          }
        >
          <ModalBody>
            <div>
              {intl.formatMessage({
                id: 'delete_a_volume_warning',
              })}
            </div>
            <div>
              {intl.formatMessage({
                id: 'delete_a_volume_confirm',
              })}
              <strong>{name}</strong>?
            </div>
          </ModalBody>
        </Modal>
      </VolumeDetailCardContainer>
    </VolumeTab>
  );
};

export default VolumeDetailCard;
