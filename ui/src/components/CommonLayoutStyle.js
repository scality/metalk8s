import styled from 'styled-components';
import {
  padding,
  fontSize,
  fontWeight,
} from '@scality/core-ui/dist/style/theme';

export const PageContainer = styled.div`
  display: flex;
  box-sizing: border-box;
  height: 100%;
  flex-wrap: wrap;
  padding: ${padding.small};
`;

export const LeftSideInstanceList = styled.div`
  flex-direction: column;
  min-height: 696px;
  width: 49%;
`;

export const RightSidePanel = styled.div`
  flex-direction: column;
  width: 51%;
  /* Make it scrollable for the small laptop screen */
  overflow-y: auto;
  margin: 0 ${padding.small} 0 8px;
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
  overflow: hidden;
`;

// Common styles for the tabs in NodePageRSP
export const NodeTab = styled.div`
  background-color: ${(props) => props.theme.brand.primary};
  color: ${(props) => props.theme.brand.textPrimary};
  padding-bottom: ${padding.base};
  height: calc(100vh - 111px);
  overflow: scroll;
`;

export const TextBadge = styled.span`
  background-color: ${(props) => props.theme.brand.info};
  color: ${(props) => props.theme.brand.textPrimary};
  padding: 2px ${padding.small};
  border-radius: 4px;
  font-size: ${fontSize.small};
  font-weight: ${fontWeight.bold};
  margin-left: ${padding.smaller};
`;

export const VolumeTab = styled.div`
  overflow: scroll;
  height: calc(100vh - 111px);
  color: ${(props) => props.theme.brand.textPrimary};
  padding-bottom: ${padding.base};
`;

export const SortCaretWrapper = styled.span`
  padding-left: ${padding.smaller};
  position: absolute;
`;

export const SortIncentive = styled.span`
  position: absolute;
  display: none;
`;

export const TableHeader = styled.span`
  padding: ${padding.base};
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
  padding: ${padding.base} ${padding.base};
  position: sticky;
  top: 0px;
  z-index: 100;
  background-color: ${(props) => props.theme.brand.primary};

  .sc-dropdown {
    padding-left: 25px;
  }

  .sc-dropdown > div {
    background-color: ${(props) => props.theme.brand.primary};
    border: 1px solid ${(props) => props.theme.brand.borderLight}
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
  font-size: ${fontSize.small};
  font-weight: ${fontWeight.bold};
  color: ${(props) => props.theme.brand.textSecondary};
  padding: ${padding.small} 0 0 ${padding.larger};
`;

export const GraphWrapper = styled.div`
  padding-left: 0px;
`;
