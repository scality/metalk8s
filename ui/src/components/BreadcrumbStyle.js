import styled from 'styled-components';
import { Link } from 'react-router-dom';
import { fontSize, padding } from '@scality/core-ui/dist/style/theme';

export const BreadcrumbContainer = styled.div`
  padding: 0 0 ${padding.smaller} ${padding.base};
`;

export const BreadcrumbLabel = styled.span`
  font-size: ${fontSize.large};
`;

export const StyledLink = styled(Link)`
  font-size: ${fontSize.large};
`;
