import styled from 'styled-components';
import { padding, fontWeight } from '@scality/core-ui/dist/style/theme';
export const TooltipContent = styled.div`
  color: ${(props) => props.theme.textSecondary};
  font-weight: ${fontWeight.bold};
  min-width: 60px;
`;