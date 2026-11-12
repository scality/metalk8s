import styled from 'styled-components';

/**
 * Guardian's dual-panel handle, on the drawer's left edge: a 1px line to look at, a grip to show
 * it moves, both centred in a 9px strip to aim at that straddles the edge.
 */
export const DrawerResizeHandle = styled.div<{ $dragging: boolean }>`
  position: absolute;
  top: 0;
  bottom: 0;
  left: -4px;
  width: 9px;
  cursor: col-resize;
  touch-action: none;
  z-index: 1;

  &::after {
    content: '';
    position: absolute;
    top: 0;
    bottom: 0;
    left: 4px;
    width: 1px;
    background-color: ${(props) => (props.$dragging ? props.theme.selectedActive : props.theme.border)};
    transition: background-color 120ms ease;
  }

  &::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 3px;
    width: 3px;
    height: 2rem;
    transform: translateY(-50%);
    border-radius: 2px;
    background-color: ${(props) => (props.$dragging ? props.theme.selectedActive : props.theme.textSecondary)};
    transition: background-color 120ms ease;
    z-index: 1;
  }

  &:hover::before,
  &:focus-visible::before {
    background-color: ${(props) => props.theme.selectedActive};
  }

  &:focus-visible {
    outline: none;
  }
`;
