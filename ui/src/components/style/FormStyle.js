import styled from 'styled-components';
import { padding } from '@scality/core-ui/dist/style/theme';

// This is a temporary styling wrapper before we merge this styling in core-ui component
export const CheckboxWrapper = styled.div`
  .sc-checkbox {
    :before {
      width: 13px;
      height: 13px;
    }

    i {
      top: 3px;
      left: 2px;
      font-size: 12px;
    }

    input[type='checkbox'] {
      margin: 0px;
    }

    span {
      vertical-align: baseline;
    }
  }
`;

export const ToggleWrapper = styled.div`
  flex: 1;
  margin-right: auto;
  display: flex;
  align-items: center;

  .sc-loader {
    margin: ${padding.small};
  }

  .text {
    font-size: 1rem;
  }
  label {
    width: 1.85rem;
    input:checked + .sc-slider:before {
      transform: translateX(1rem);
    }
    .sc-slider:before {
      height: 12px;
      width: 12px;
      top: -4px;
    }
  }
`;
