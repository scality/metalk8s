import { padding } from '@scality/core-ui/dist/style/theme';
import styled from 'styled-components';
export const FormStyle = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding-bottom: ${padding.base};
  min-height: 220px;
  .sc-input {
    display: inline-flex;
    margin: ${padding.smaller} 0;
    justify-content: center;
    .sc-input-label {
      width: 200px;
    }
  }
`;
export const ActionContainer = styled.div`
  display: flex;
  justify-content: space-between;
  margin: 10px 0;
  padding: 10px 0;
`;