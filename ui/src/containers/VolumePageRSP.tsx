import { spacing, TextBadge } from '@scality/core-ui';
import { Tabs } from '@scality/core-ui/dist/next';
import { useIntl } from 'react-intl';
import { useLocation, useParams } from 'react-router';
import AlertsTab from '../components/AlertsTab';
import {
  NoInstanceSelected,
  NoInstanceSelectedContainer,
  NotBoundContainer,
  RightSidePanel,
} from '../components/style/CommonLayoutStyle';
import VolumeDetailsTab from '../components/VolumeDetailsTab';
import VolumeMetricsTab from '../components/VolumeMetricsTab';
import VolumeOverviewTab from '../components/VolumeOverviewTab';
import { LVM_LOGICAL_VOLUME, RAW_BLOCK_DEVICE, SPARSE_LOOP_DEVICE } from '../constants';
import { computeVolumeGlobalStatus } from '../services/NodeVolumesUtils';
import { useAlerts } from './AlertProvider';

export const VolumePageRSP = (props) => {
  const { volumes, nodes, volumeListData, pVList, pods, currentVolumeObject } = props;

  const { name } = useParams();
  const intl = useIntl();
  const { pathname } = useLocation();
  const baseUrl = pathname.substring(0, pathname.lastIndexOf('/'));

  const currentVolumeName = name;
  const volume = volumes?.find((volume) => volume.metadata.name === currentVolumeName);
  const currentVolume = volumeListData?.find((vol) => vol.name === currentVolumeName);
  const volumeStatus = computeVolumeGlobalStatus(volume?.metadata?.name, volume?.status);

  const pV = pVList?.find((pv) => pv.metadata.name === currentVolumeName);

  const PVCName = pV?.spec?.claimRef?.name;
  const PVCNamespace = pV?.spec?.claimRef?.namespace;
  const UsedPod =
    PVCName && pods?.find((pod) => pod.volumes.find((volume) => volume.persistentVolumeClaim === PVCName));

  const alertsVolume = useAlerts({
    persistentvolumeclaim: PVCName,
  });
  const alertlist = alertsVolume && alertsVolume.alerts;
  const criticalAlerts = alertlist.filter((alert) => alert.severity === 'critical');

  const deviceName = volume?.status?.deviceName;
  const instanceIp = nodes.find((node) => node.name === volume?.spec?.nodeName)?.internalIP;

  return currentVolumeName && volume ? (
    <RightSidePanel>
      <Tabs>
        <Tabs.Tab
          path={`${baseUrl}/overview`}
          label={intl.formatMessage({
            id: 'overview',
          })}
          data-cy="overview_tab_volume_page"
        >
          <VolumeOverviewTab
            name={currentVolumeName}
            nodeName={volume?.spec?.nodeName}
            status={
              volumeStatus ??
              intl.formatMessage({
                id: 'unknown',
              })
            }
            storageClassName={volume?.spec?.storageClassName}
            creationTimestamp={volume?.metadata?.creationTimestamp}
            volumeType={
              volume.spec && Object.hasOwn(volume.spec, 'rawBlockDevice')
                ? RAW_BLOCK_DEVICE
                : volume.spec && Object.hasOwn(volume.spec, 'lvmLogicalVolume')
                  ? LVM_LOGICAL_VOLUME
                  : SPARSE_LOOP_DEVICE
            }
            usedPodName={
              UsedPod
                ? UsedPod?.name
                : intl.formatMessage({
                    id: 'not_used',
                  })
            }
            devicePath={
              volume?.spec?.rawBlockDevice?.devicePath ??
              intl.formatMessage({
                id: 'not_applicable',
              })
            }
            vgName={
              volume?.spec?.lvmLogicalVolume?.vgName ??
              intl.formatMessage({
                id: 'not_applicable',
              })
            }
            volumeUsagePercentage={currentVolume?.usage}
            volumeUsageBytes={currentVolume?.usageRawData ?? 0}
            storageCapacity={volumeListData?.find((vol) => vol.name === currentVolumeName)?.storageCapacity}
            health={volumeListData?.find((vol) => vol.name === currentVolumeName)?.health}
            condition={currentVolume?.status} // the delete button inside the volume detail card should know that which volume is the first one
            volumeListData={volumeListData}
            pVList={pVList}
            alertlist={alertlist}
          />
        </Tabs.Tab>
        <Tabs.Tab
          path={`${baseUrl}/alerts`}
          label={intl.formatMessage({
            id: 'alerts',
          })}
          textBadge={
            alertlist && alertlist.length ? (
              <TextBadge
                variant={criticalAlerts.length > 0 ? 'statusCritical' : 'statusWarning'}
                text={`${alertlist.length}`}
              />
            ) : null
          }
          data-cy="alerts_tab_volume_page"
          withoutPadding
        >
          {PVCName ? (
            <AlertsTab alerts={alertlist} status={alertsVolume.status} />
          ) : (
            <NotBoundContainer pt={spacing.r32}>
              {intl.formatMessage({
                id: 'volume_is_not_bound',
              })}
            </NotBoundContainer>
          )}
        </Tabs.Tab>
        <Tabs.Tab
          path={`${baseUrl}/metrics`}
          label={intl.formatMessage({
            id: 'metrics',
          })}
          data-cy="metrics_tab_volume_page"
        >
          <VolumeMetricsTab
            volumeName={currentVolumeName}
            deviceName={deviceName}
            instanceIp={instanceIp} // the volume condition compute base on the `status` and `bound/unbound`
            volumeCondition={currentVolume?.status}
            volumePVCName={PVCName}
            volumeNamespace={PVCNamespace}
          />
        </Tabs.Tab>
        <Tabs.Tab
          label={intl.formatMessage({
            id: 'details',
          })}
          path={`${baseUrl}/details`}
          data-cy="details_tab_volume_page"
        >
          <VolumeDetailsTab currentVolumeObject={currentVolumeObject} />
        </Tabs.Tab>
      </Tabs>
    </RightSidePanel>
  ) : (
    <NoInstanceSelectedContainer>
      <NoInstanceSelected>
        {currentVolumeName
          ? `Volume ${currentVolumeName} ${intl.formatMessage({
              id: 'not_found',
            })}`
          : intl.formatMessage({
              id: 'no_volume_selected',
            })}
      </NoInstanceSelected>
    </NoInstanceSelectedContainer>
  );
};
