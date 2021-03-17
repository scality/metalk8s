import styled from 'styled-components';
import { padding, fontWeight } from '@scality/core-ui/dist/style/theme';

export const PageContainer = styled.div`
  display: flex;
  box-sizing: border-box;
  height: 100%;
  flex-wrap: wrap;
  padding: 0;
`;

export const CenteredPageContainer = styled.div`
  display: flex;
  justify-content: space-around;
`;

export const LeftSideInstanceList = styled.div`
  flex-direction: column;
  min-height: 696px;
  width: 49%;
  margin-bottom: 20px;
  min-width: 450px;
`;

export const RightSidePanel = styled.div`
  flex-direction: column;
  width: 51%;
  margin: 0 ${padding.small} ${padding.small} 8px;
`;

export const NoInstanceSelectedContainer = styled.div`
  width: 51%;
  min-height: 700px;
  background-color: ${(props) => props.theme.brand.primaryDark1};
  margin: ${padding.small};
`;

export const NoInstanceSelected = styled.div`
  position: relative;
  top: 50%;
  transform: translateY(-50%);
  color: ${(props) => props.theme.brand.textPrimary};
  text-align: center;
`;

export const PageContentContainer = styled.div`
  display: flex;
  flex-direction: row;
  height: 100%;
  width: 100%;
  background-color: ${(props) => props.theme.brand.background};
`;

export const TabsItemsStyle = styled.div`
  height: 100%;
  .sc-tabs {
    margin: 0;
    height: 100%;
    display: flex;
    flex-direction: column;
  }
  .sc-tabs-bar {
    height: 2.8rem;
  }
  .sc-tabs-item {
    margin-right: 0.3rem;
    background-color: ${(props) => props.theme.brand.border};
    border-top-left-radius: 4px;
    border-top-right-radius: 4px;
    height: 2.8rem;
    .sc-tabs-item-title {
      height: 2.8rem;
      font-size: 1rem;
      border-top-left-radius: 4px;
      border-top-right-radius: 4px;
      padding: 0.7rem 0 0 0.2rem;
    }
  }
  .sc-tabs-item-content {
    padding: 0;
    flex: 1;
  }
`;

export const TextBadge = styled.span`
  background-color: ${(props) => props.theme.brand.info};
  color: ${(props) => props.theme.brand.textPrimary};
  padding: 2px 0.6rem;
  border-radius: 4px;
  font-size: 0.9rem;
  font-weight: ${fontWeight.bold};
  margin-left: ${padding.smaller};
`;

export const VolumeTab = styled.div`
  height: 100%;
  overflow: auto;
  color: ${(props) => props.theme.brand.textPrimary};
  background-color: ${(props) => props.theme.brand.primary};
`;

// Common styles for the tabs in NodePageRSP
export const NodeTab = styled.div`
  height: 100%;
  background-color: ${(props) => props.theme.brand.primary};
  color: ${(props) => props.theme.brand.textPrimary};
  overflow: auto;
`;

export const SortCaretWrapper = styled.span`
  padding-left: 1px;
  position: absolute;
`;

export const SortIncentive = styled.span`
  position: absolute;
  display: none;
`;

export const TableHeader = styled.div`
  padding-bottom: ${padding.base};
  &:hover {
    ${SortIncentive} {
      display: block;
    }
  }
`;

export const MetricsActionContainer = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: flex-end;
  padding: ${padding.large} ${padding.base};
  position: sticky;
  top: 0px;
  z-index: 100;
  background-color: ${(props) => props.theme.brand.primary};

  .sc-dropdown {
    padding-left: 25px;
  }

  .sc-dropdown > div {
    background-color: ${(props) => props.theme.brand.primary};
    border: 1px solid ${(props) => props.theme.brand.borderLight};
    border-radius: 3px;
  }

  .sc-button {
    background-color: ${(props) => props.theme.brand.info};
  }
`;

export const GraphsContainer = styled.div`
  display: flex;
  flex-direction: column;
  padding: ${padding.small};
  overflow: auto;
  .sc-vegachart svg {
    background-color: inherit !important;
  }
`;

export const RowGraphContainer = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: space-between;
`;

export const GraphTitle = styled.div`
  font-size: 1rem;
  font-weight: ${fontWeight.bold};
  color: ${(props) => props.theme.brand.textPrimary};
  padding: ${padding.base} 0 0 ${padding.larger};
  display: flex;
  .sc-loader {
    padding-left: ${padding.small};
  }
`;

export const GraphWrapper = styled.div`
  padding-left: 0px;
`;

export const TitlePage = styled.div`
  color: ${(props) => props.theme.brand.textPrimary};
  font-size: 24px;
  padding: ${padding.small} 0 0 ${padding.large};
`;
