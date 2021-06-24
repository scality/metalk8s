import React from 'react';
import styled from 'styled-components';
import { Tooltip, ConstrainedText } from '@scality/core-ui';
import { fontWeight, padding } from '@scality/core-ui/dist/style/theme';
import { useIntl } from 'react-intl';

const TableRowStyle = styled.div`
  &:hover,
  &:focus {
    background-color: ${(props) => props.theme.highlight};
    outline: none;
    cursor: pointer;
  }

  &:last-child {
    border: none;
  }
  box-sizing: border-box;
  border-right: 4px solid
    ${(props) =>
      props.isSelected
        ? props.theme.selectedActive
        : props.theme.backgroundLevel2};

  background-color: ${(props) =>
    props.isSelected
      ? props.theme.highlight
      : props.theme.backgroundLevel2};
`;

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

const TableRow = (props) => {
  const { row, style, onClickRow, isSelected } = props;
  const intl = useIntl();
  return (
    <TableRowStyle
      {...row.getRowProps({
        onClick: () => onClickRow(row),
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
                tooltipPlacement={cell.row.index === 0 ? 'bottom' : 'top'}
              ></ConstrainedText>
            </div>
          );
        } else if (cell.column.Header !== 'Name' && cell.value === undefined) {
          return (
            <div {...cellProps} className="td">
              <Tooltip
                placement={cell.row.index === 0 ? 'bottom' : 'top'}
                overlay={
                  <TooltipContent>
                    {intl.formatMessage({ id: 'unknown' })}
                  </TooltipContent>
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
