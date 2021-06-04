import styled from 'styled-components';
import { padding, fontWeight } from '@scality/core-ui/dist/style/theme';

export const TooltipContent = styled.div`
  color: ${(props) => props.theme.textSecondary};
  font-weight: ${fontWeight.bold};
  min-width: 60px;
`;

export const UnknownIcon = styled.i`
  color: ${(props) => props.theme.textSecondary};
  // Increase the height so that the users don't need to hover precisely on the hyphen.
  height: 30px;
  padding-top: ${padding.base};
`;
