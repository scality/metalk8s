import React from 'react';
import styled from 'styled-components';
import { spacing } from '@scality/core-ui/dist/style/theme';
import DashboardAlerts from './DashboardAlerts';
import DashboardHealthBar from './DashboardHealthBar';

const GlobalHealthContainer = styled.div`
  display: flex;
  height: 100%;
  padding: 0 ${spacing.sp24} 0 ${spacing.sp24};

  .healthbar {
    flex: 1 0 70%;
  }
  .alerts {
    flex: 1 0 20%;
  }
  & > div {
    display: flex;
    align-items: center;
    &:not(:first-of-type):before {
      content: '';
      position: relative;
      margin: 0 ${spacing.sp32} 0 ${spacing.sp32};
      height: ${spacing.sp32};
      width: ${spacing.sp2};
      background-color: ${(props) => props.theme.backgroundLevel1};
    }
  }
`;

const DashboardGlobalHealth = () => {
  return (
    <GlobalHealthContainer>
      <div className="healthbar">
        <DashboardHealthBar />
      </div>
      <div className="alerts">
        <DashboardAlerts />
      </div>
    </GlobalHealthContainer>
  );
};

export default DashboardGlobalHealth;
