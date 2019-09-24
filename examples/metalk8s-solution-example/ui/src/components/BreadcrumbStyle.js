import styled from 'styled-components';
import { Link } from 'react-router-dom';
import { fontSize, padding } from '@scality/core-ui/dist/style/theme';

export const BreadcrumbContainer = styled.div`
  margin-left: ${padding.small};
  .sc-breadcrumb {
    padding: ${padding.smaller};
  }
`;

export const BreadcrumbLabel = styled.span`
  font-size: ${fontSize.large};
`;

export const StyledLink = styled(Link)`
  font-size: ${fontSize.large};
`;
