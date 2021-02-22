//@flow
import React from 'react';
import styled from 'styled-components';

const DashboardGrid = styled.div`
  display: grid;
  gap: 8px;
  grid-template:
    'health    health   network metrics' 160px
    'inventory services network metrics' 160px
    'alerts    services network metrics' auto
    / 1fr 1fr 1fr 1fr;

  @media (max-width: 1024px) {
    grid-template:
      'health    health' 160px
      'inventory services' 160px
      'alerts    services' minmax(160px, auto)
      'network   metrics' auto
      / 1fr 1fr;
  }

  height: calc(100vh - 48px - 8px);
  margin: 0 8px 0 8px;

  div {
    background-color: ${(props) => props.theme.brand.primary};
    color: ${(props) => props.theme.brand.textPrimary};
  }
  .health {
    grid-area: health;
  }
  .inventory {
    grid-area: inventory;
  }
  .alerts {
    grid-area: alerts;
  }
  .services {
    grid-area: services;
  }
  .network {
    grid-area: network;
  }
  .metrics {
    grid-area: metrics;
  }
`;

const DashboardPage = (props: {}) => {
  return (
    <DashboardGrid>
      <div className="health">Global Health</div>
      <div className="inventory">Inventory</div>
      <div className="alerts">Alerts</div>
      <div className="services">Services</div>
      <div className="network">Network</div>
      <div className="metrics">Metrics</div>
    </DashboardGrid>
  );
};
export default DashboardPage;
