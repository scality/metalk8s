import styled from 'styled-components';
import {
  padding,
  fontWeight,
  fontSize,
  spacing,
} from '@scality/core-ui/dist/style/theme';
export const CenteredPageContainer = styled.div`
  display: flex;
  justify-content: space-around;
  background-color: ${(props) => props.theme.backgroundLevel1};
`;
export const LeftSideInstanceList = styled.div`
  flex: 1;
  background-color: ${(props) => props.theme.backgroundLevel2};
`;
export const RightSidePanel = styled.div`
  flex: 1;
  min-width: 0;
`;
export const NoInstanceSelectedContainer = styled.div`
  flex: 1;
  background-color: ${(props) => props.theme.backgroundLevel4};
  display: flex;
  justify-content: center;
  align-items: center;
`;
export const NoInstanceSelected = styled.div`
  color: ${(props) => props.theme.textPrimary};
  text-align: center;
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: center;
`;
export const PageContentContainer = styled.div`
  display: flex;
  flex-direction: row;
  height: 100%;
  width: 100%;
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
  padding-left: ${spacing.sp4};
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
  max-width: 94%;
`;
export const GraphsWrapper = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: space-around;
  flex-grow: 1;
  // make sure the charts resize when the width of parent has changed.
  .vega-embed > svg {
    width: 100%;
  }
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
export const OverviewInformationLabel = styled.span`
  display: inline-block;
  min-width: 10.714rem;
  color: ${(props) => props.theme.textSecondary};
`;
export const OverviewInformationSpan = styled.div`
  padding-bottom: ${padding.large};
  padding-left: ${padding.large};
  display: flex;
`;
export const OverviewInformationWrapper = styled.div`
  padding-left: 0.313rem;
`;
export const OverviewInformationValue = styled.span`
  color: ${(props) => props.theme.textPrimary};
  font-size: ${fontSize.base};
  word-wrap: break-word;
  max-width: 20rem;
`;
export const OverviewClickableInformationValue = styled.span`
  color: ${(props) => props.theme.selectedActive};
  font-size: ${fontSize.base};
  font-weight: ${fontWeight.semibold};
  cursor: pointer;
`;
export const OverviewResourceName = styled.span`
  font-size: ${fontSize.larger};
  padding-left: ${padding.smaller};
`;
export const ActiveAlertTitle = styled.div`
  color: ${(props) => props.theme.textPrimary};
  font-size: ${fontSize.base};
  font-weight: ${fontWeight.bold};
  padding: 0 0 ${padding.base} 0;
`;
export const ActiveAlertWrapper = styled.div`
  display: flex;
  flex-direction: column;
  padding: 0 ${padding.base} 0 0;
  width: 200px;
`;
