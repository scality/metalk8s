//@flow
import {
  padding,
  fontSize,
  fontWeight,
} from '@scality/core-ui/dist/style/theme';
import styled from 'styled-components';

export const InformationListContainer = styled.div`
  display: flex;
  flex-direction: column;
  margin: ${padding.base};
`;

export const InformationSpan = styled.span`
  padding: 0 ${padding.larger} ${padding.small} 0;
`;

export const InformationLabel = styled.span`
  font-size: ${fontSize.large};
  padding-right: ${padding.base};
  min-width: 150px;
  display: inline-block;
`;

export const InformationValue = styled.span`
  font-size: ${fontSize.large};
`;

export const InformationMainValue = styled(InformationValue)`
  font-weight: ${fontWeight.bold};
`;
