import React from 'react';
import styled from 'styled-components';
import { useIntl } from 'react-intl';

import { spacing } from '@scality/core-ui/dist/style/theme';
import { PageSubtitle } from '../components/style/CommonLayoutStyle';

import DashboardPlane from './DashboardPlane';

export const NetworkContainer = styled.div`
  padding: ${spacing.sp2} ${spacing.sp4};
  display: flex;
  flex-direction: column;
  flex-grow: 1;
`;

export const PanelActions = styled.div`
  display: flex;
  padding: ${spacing.sp4};
  align-items: center;
  justify-content: space-between;
`;

const DashboardNetwork = () => {
  const intl = useIntl();

  return (
    <NetworkContainer>
      <PanelActions>
        <PageSubtitle>{intl.formatMessage({ id: 'network' })}</PageSubtitle>
      </PanelActions>
      <DashboardPlane />
    </NetworkContainer>
  );
};

export default DashboardNetwork;
