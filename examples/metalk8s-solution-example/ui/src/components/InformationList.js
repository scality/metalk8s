//@flow
import {
  padding,
  fontSize,
  fontWeight
} from '@scality/core-ui/dist/style/theme';
import styled from 'styled-components';

export const InformationListContainer = styled.div`
  display: flex;
  flex-direction: column;
  margin: ${padding.base} ${padding.larger};
`;

export const InformationSpan = styled.span`
  padding: ${padding.smaller} ${padding.larger};
`;

export const InformationLabel = styled.span`
  font-size: ${fontSize.base};
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
