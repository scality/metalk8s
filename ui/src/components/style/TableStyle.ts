import { fontWeight, padding } from '@scality/core-ui/dist/style/theme';
import styled from 'styled-components';
export const TooltipContent = styled.div`
  color: ${(props) => props.theme.textSecondary};
  font-weight: ${fontWeight.bold};
  min-width: 60px;
`;
