import React from 'react';
import styled from 'styled-components';
import { Tooltip, ConstrainedText } from '@scality/core-ui';
import { fontWeight, padding } from '@scality/core-ui/dist/style/theme';
import { intl } from '../translations/IntlGlobalProvider';

const TableRowStyle = styled.div`
  &:hover,
  &:focus {
    background-color: ${(props) => props.theme.brand.backgroundBluer};
    outline: none;
  }

  &:last-child {
    border: none;
  }

  background-color: ${(props) =>
    props.isSelected
      ? props.theme.brand.backgroundBluer
      : props.theme.brand.primary};
`;

export const TooltipContent = styled.div`
  color: ${(props) => props.theme.brand.textSecondary};
  font-weight: ${fontWeight.bold};
  min-width: 60px;
`;

export const UnknownIcon = styled.i`
  color: ${(props) => props.theme.brand.textSecondary};
  // Increase the height so that the users don't need to hover precisely on the hyphen.
  height: 30px;
  padding-top: ${padding.base};
`;

const TableRow = (props) => {
  const { row, style, isSelected } = props;

  return (
    <TableRowStyle
      {...row.getRowProps({
        // Note:
        // We need to pass the style property to the row component.
        // Otherwise when we scroll down, the next rows are flashing because they are re-rendered in loop.
        style: { ...style },
      })}
      isSelected={isSelected}
      row={row}
    >
      {row.cells.map((cell) => {
        let cellProps = cell.getCellProps({
          style: {
            ...cell.column.cellStyle,
            // Vertically center the text in cells.
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
          },
        });

        if (cell.column.Header === 'Name' || cell.column.Header === 'Node') {
          return (
            <div {...cellProps} data-cy="volume_table_name_cell" className="td">
              <ConstrainedText
                text={cell.value}
                tooltipStyle={{ width: '150px' }}
              ></ConstrainedText>
            </div>
          );
        } else if (cell.column.Header !== 'Name' && cell.value === undefined) {
          return (
            <div {...cellProps} className="td">
              <Tooltip
                placement="top"
                overlay={
                  <TooltipContent>{intl.translate('unknown')}</TooltipContent>
                }
              >
                <UnknownIcon className="fas fa-minus"></UnknownIcon>
              </Tooltip>
            </div>
          );
        } else {
          return (
            <div {...cellProps} className="td">
              {cell.render('Cell')}
            </div>
          );
        }
      })}
    </TableRowStyle>
  );
};

export default TableRow;
