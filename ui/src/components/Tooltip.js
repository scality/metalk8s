import React from 'react';
import RcTooltip from 'rc-tooltip';
import 'rc-tooltip/assets/bootstrap.css';

const Tooltip = props => {
  return (
    <RcTooltip
      placement={props.placement}
      mouseEnterDelay={props.mouseEnterDelay}
      mouseLeaveDelay={props.mouseLeaveDelay}
      destroyTooltipOnHide={props.destroyTooltipOnHide}
      trigger={props.trigger}
      overlay={props.overlay}
    >
      {props.children}
    </RcTooltip>
  );
};

Tooltip.defaultProps = {
  placement: 'bottom',
  mouseEnterDelay: 0,
  mouseLeaveDelay: 0,
  destroyTooltipOnHide: true,
  trigger: ['hover'],
  overlay: null
};

export default Tooltip;
