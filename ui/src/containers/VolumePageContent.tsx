/* eslint-disable react-hooks/exhaustive-deps */
import { AppContainer, EmptyState, TwoPanelLayout } from '@scality/core-ui';
import { useEffect, useState } from 'react';
import { Route, Routes, useLocation } from 'react-router';
import VolumeListTable from '../components/VolumeListTable';
import { LeftSideInstanceList } from '../components/style/CommonLayoutStyle';
import { usePrevious } from '../services/utils';
import { VolumePageRSP } from './VolumePageRSP';
import { useBasenameRelativeNavigate } from '@scality/module-federation';

// <VolumePageContent> component extracts volume name from URL and holds the volume-specific data.
// The three components in RightSidePanel (<VolumeOverviewTab> / <AlertsTab> / <MetricGraphCard>) are dumb components,
// so that with the implementation of Tabs no re-render should happen during the switch.
const VolumePageContent = (props) => {
  const { volumeListData, loading } = props;
  const navigate = useBasenameRelativeNavigate();
  const location = useLocation();
  const [isFirstLoadingDone, setIsFirstLoadingDone] = useState(false);
  const previousLoading = usePrevious(loading);
  const currentVolumeName = location?.pathname.split('/')?.slice(2)[1] || '';

  // If data has been retrieved and no volume is selected yet we select the first one
  useEffect(() => {
    if (volumeListData.length > 0) {
      const firstVolumeName = volumeListData[0]?.name;
      if (firstVolumeName && !location.pathname.includes(firstVolumeName) && location.pathname.endsWith('/volumes')) {
        navigate(`/volumes/${firstVolumeName}/overview`, { replace: true });
      }
    }
  }, [JSON.stringify(volumeListData)]);

  useEffect(() => {
    if (previousLoading && !loading && !isFirstLoadingDone) setIsFirstLoadingDone(true);
  }, [previousLoading, loading, isFirstLoadingDone]);

  if (!volumeListData.length && isFirstLoadingDone) {
    return (
      <EmptyState
        listedResource={{
          singular: 'Volume',
          plural: 'Volumes',
        }}
        link="/volumes/createVolume"
        icon="Node-pdf"
      />
    );
  }

  return (
    <AppContainer.MainContent hasTopMargin>
      <TwoPanelLayout
        panelsRatio="50-50"
        leftPanel={{
          children: (
            <LeftSideInstanceList>
              <VolumeListTable volumeListData={volumeListData} volumeName={currentVolumeName}></VolumeListTable>
            </LeftSideInstanceList>
          ),
        }}
        rightPanel={{
          children: (
            <Routes>
              <Route path="*" element={<VolumePageRSP {...props} />} />
            </Routes>
          ),
        }}
      />
    </AppContainer.MainContent>
  );
};

export default VolumePageContent;
