//@flow
import {
  padding,
  fontSize,
  fontWeight,
} from '@scality/core-ui/dist/style/theme';
import styled from 'styled-components';

export const InformationListContainer = styled.div`
  color: ${(props) => props.theme.textPrimary};
  display: flex;
  flex-direction: column;
  margin: ${padding.base};
`;

export const InformationSpan = styled.span`
  padding: 0 ${padding.larger} ${padding.small} 0;
`;

export const InformationLabel = styled.span`
  font-size: ${fontSize.small};
  padding-right: ${padding.base};
  min-width: 150px;
  display: inline-block;
`;

export const InformationValue = styled.span`
  font-size: ${fontSize.base};
`;

export const InformationMainValue = styled(InformationValue)`
  font-weight: ${fontWeight.bold};
`;
