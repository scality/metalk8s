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
  background-color: ${(props) => props.theme.backgroundLevel1};
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
  margin: 0 ${padding.small} ${padding.small} 1px;
`;

export const NoInstanceSelectedContainer = styled.div`
  width: 51%;
  min-height: 700px;
  background-color: ${(props) => props.theme.backgroundLevel4};
  margin: ${padding.small};
`;

export const NoInstanceSelected = styled.div`
  position: relative;
  top: 50%;
  transform: translateY(-50%);
  color: ${(props) => props.theme.textPrimary};
  text-align: center;
`;

export const PageContentContainer = styled.div`
  display: flex;
  flex-direction: row;
  height: 100%;
  width: 100%;
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
    background-color: ${(props) => props.theme.backgroundLevel3};
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
    background-color: ${(props) => props.theme.backgroundLevel4};
  }
`;

export const TextBadge = styled.span`
  background-color: ${(props) => props.theme[props.variant]};
  color: ${(props) => props.theme.textReverse};
  padding: 2px ${padding.smaller};
  border-radius: 4px;
  font-size: 0.8rem;
  font-weight: ${fontWeight.bold};
  margin-left: ${padding.smaller};
`;

export const VolumeTab = styled.div`
  height: 100%;
  overflow: auto;
  color: ${(props) => props.theme.textPrimary};
`;

// Common styles for the tabs in NodePageRSP
export const NodeTab = styled.div`
  height: 100%;
  overflow: auto;
  color: ${(props) => props.theme.textPrimary};
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
  background-color: ${(props) => props.theme.backgroundLevel4};

  .sc-dropdown {
    padding-left: 25px;
  }

  .sc-dropdown > div {
    background-color: ${(props) => props.theme.backgroundLevel4};
    border: 1px solid ${(props) => props.theme.textTertiary};
    border-radius: 3px;
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
  color: ${(props) => props.theme.textPrimary};
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
  color: ${(props) => props.theme.textPrimary};
  font-size: 24px;
  padding: ${padding.small} 0 0 ${padding.large};
`;

export const PageSubtitle = styled.h3`
  color: ${(props) => props.theme.textPrimary};
  margin: ${padding.small} 0;
  display: flex;
  align-items: center;
`;
