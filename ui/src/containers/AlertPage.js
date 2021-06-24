//@flow
import React, { useMemo } from 'react';
import styled, { useTheme } from 'styled-components';
import { useHistory } from 'react-router';
import { useLocation } from 'react-router-dom';
import {
  useTable,
  useSortBy,
  useAsyncDebounce,
  useFilters,
  useGlobalFilter,
} from 'react-table';
import { EmptyTable, SearchInput } from '@scality/core-ui';
import { padding, fontSize } from '@scality/core-ui/dist/style/theme';
import { useAlerts } from './AlertProvider';
import CircleStatus from '../components/CircleStatus';
import { TextBadge } from '../components/style/CommonLayoutStyle';
import {
  compareHealth,
  useURLQuery,
  useTableSortURLSync,
  formatDateToMid1,
} from '../services/utils';
import { useIntl } from 'react-intl';

const AlertPageContainer = styled.div`
  display: flex;
  flex-direction: column;
  margin: ${padding.base};
  background-color: ${(props) => props.theme.backgroundLevel1};
`;

const AlertPageHeaderContainer = styled.div`
  display: flex;
  align-items: center;
  background: ${(props) => props.theme.backgroundLevel2};
  margin: 36px 0 ${padding.small};
  padding: ${padding.base} 0 ${padding.base} ${padding.larger};
`;

const Title = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-around;
  width: 250px;
  font-size: ${fontSize.larger};
  font-weight: bold;
  color: ${(props) => props.theme.textPrimary};
`;

const SecondaryTitle = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: ${fontSize.bases};
  width: 250px;
  color: ${(props) => props.theme.textSecondary};
`;

const TertiaryTitle = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-around;
  font-size: ${fontSize.base};
  width: 250px;
  color: ${(props) => props.theme.textPrimary};
`;

const SeperationLine = styled.div`
  width: 250px; // the same width as the container
  height: 37px;
  border-right: 2px solid ${(props) => props.theme.backgroundLevel1};
  position: absolute;
`;

function AlertLogo({
  color,
}: {
  color: 'statusHealthy' | 'statusWarning' | 'statusCritical',
}) {
  const theme = useTheme();
  return (
    <svg
      width="66"
      height="66"
      viewBox="0 0 66 66"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle
        cx="33"
        cy="33"
        r="32"
        fill={theme.backgroundLevel1}
        stroke={theme.infoPrimary}
      />
      <path
        d="M33 50C35.1875 50 36.9375 48.25 36.9375 46H29C29 48.25 30.75 50 33 50ZM46.4375 40.6875C45.25 39.375 42.9375 37.4375 42.9375 31C42.9375 26.1875 39.5625 22.3125 34.9375 21.3125V20C34.9375 18.9375 34.0625 18 33 18C31.875 18 31 18.9375 31 20V21.3125C26.375 22.3125 23 26.1875 23 31C23 37.4375 20.6875 39.375 19.5 40.6875C19.125 41.0625 18.9375 41.5625 19 42C19 43.0625 19.75 44 21 44H44.9375C46.1875 44 46.9375 43.0625 47 42C47 41.5625 46.8125 41.0625 46.4375 40.6875Z"
        fill={theme[color]}
      />
    </svg>
  );
}

function AlertPageHeader({
  activeAlerts,
  critical,
  warning,
}: {
  activeAlerts: number,
  critical: number,
  warning: number,
}) {
  const intl = useIntl();
  return (
    <AlertPageHeaderContainer>
      <Title>
        <AlertLogo
          color={
            critical > 0
              ? 'statusCritical'
              : warning > 0
              ? 'statusWarning'
              : 'statusHealthy'
          }
        />
        <>{intl.formatMessage({ id: 'alerts' })}</>
        <SeperationLine />
      </Title>

      <SecondaryTitle>
        <>{intl.formatMessage({ id: 'active_alerts' })}</>
        <TextBadge variant="infoPrimary">{`${activeAlerts}`}</TextBadge>
        <SeperationLine />
      </SecondaryTitle>

      <TertiaryTitle>
        <div>
          Critical
          <TextBadge variant="statusCritical">{`${critical}`}</TextBadge>
        </div>
        <div>
          Warning
          <TextBadge variant="statusWarning">{`${warning}`}</TextBadge>
        </div>
      </TertiaryTitle>
    </AlertPageHeaderContainer>
  );
}

const HeadRow = styled.tr`
  width: 100%;
  display: table;
  table-layout: fixed;
  border-bottom: 1px solid ${(props) => props.theme.backgroundLevel1};
`;

const Body = styled.tbody`
  display: block;
  height: calc(100vh - 335px);
  overflow: auto;
`;

export const SortCaretWrapper = styled.span`
  padding-left: ${padding.smaller};
  position: absolute;
`;

export const SortIncentive = styled.span`
  position: absolute;
  display: none;
`;

export const TableHeader = styled.th`
  &:hover {
    ${SortIncentive} {
      display: block;
    }
  }
`;

const SearchBarContainer = styled.div`
  padding-left: ${padding.base};
  flex: 1;
`;

const AlertContent = styled.div`
  color: ${(props) => props.theme.textPrimary};
  padding: 1rem;
  font-family: 'Lato';
  font-size: ${fontSize.base};
  background-color: ${(props) => props.theme.backgroundLevel3};
  height: 100%;

  table {
    border-spacing: 0;

    th {
      font-weight: bold;
      height: 56px;
      text-align: left;
      padding: 0.5rem;
      // cursor should be the action cursor
      cursor: pointer;
    }

    td {
      height: 80px;
      margin: 0;
      padding: 0.5rem;
      height: 30px;
    }

    .sc-emptytable {
      background-color: ${(props) => props.theme.backgroundLevel3};
      > * {
        background-color: ${(props) => props.theme.backgroundLevel3};
      }
    }

    .sc-searchinput {
      width: 240px;
    }
  }
`;

function GlobalFilter({
  preGlobalFilteredRows,
  globalFilter,
  setGlobalFilter,
}) {
  const [value, setValue] = React.useState(globalFilter);
  const history = useHistory();
  const location = useLocation();
  const onChange = useAsyncDebounce((value) => {
    setGlobalFilter(value || undefined);

    // update the URL with the content of search
    const searchParams = new URLSearchParams(location.search);
    const isSearch = searchParams.has('search');
    if (!isSearch) {
      searchParams.append('search', value);
    } else {
      searchParams.set('search', value);
    }
    history.push(`?${searchParams.toString()}`);
  }, 500);

  return (
    <SearchBarContainer>
      <SearchInput
        value={value || undefined}
        onChange={(e) => {
          setValue(e.target.value);
          onChange(e.target.value);
        }}
        placeholder={`Search`}
        disableToggle={true}
      />
    </SearchBarContainer>
  );
}

function ActiveAlertTab({ columns, data }) {
  const query = useURLQuery();
  const querySearch = query.get('search');
  const querySort = query.get('sort');
  const queryDesc = query.get('desc');
  const intl = useIntl();
  // Use the state and functions returned from useTable to build your UI
  const defaultColumn = React.useMemo(
    () => ({
      Filter: GlobalFilter,
    }),
    [],
  );

  const sortTypes = React.useMemo(() => {
    return {
      severity: (row1, row2) => {
        return compareHealth(row2?.values?.severity, row1?.values?.severity);
      },
      name: (row1, row2) => {
        const a = row1?.values['labels.alertname'];
        const b = row2.values['labels.alertname'];
        return a.toLowerCase().localeCompare(b.toLowerCase());
      },
      description: (row1, row2) => {
        const a = row1?.values?.description;
        const b = row2.values?.description;
        return a.toLowerCase().localeCompare(b.toLowerCase());
      },
      startsAt: (row1, row2) => {
        const a = row1?.values?.startsAt;
        const b = row2.values?.startsAt;
        return new Date(a) - new Date(b);
      },
    };
  }, []);
  const DEFAULT_SORTING_KEY = 'severity';
  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    rows,
    prepareRow,
    state,
    visibleColumns,
    preGlobalFilteredRows,
    setGlobalFilter,
  } = useTable(
    {
      columns,
      data,
      defaultColumn,
      initialState: {
        globalFilter: querySearch || undefined,
        sortBy: [
          {
            id: querySort || DEFAULT_SORTING_KEY,
            desc: queryDesc || false,
          },
        ],
      },
      disableMultiSort: true,
      autoResetSortBy: false,
      sortTypes,
    },
    useFilters,
    useGlobalFilter,
    useSortBy,
  );

  // Synchronizes the params query with the Table sort state
  const sorted = headerGroups[0].headers.find((item) => item.isSorted === true)
    ?.id;
  const desc = headerGroups[0].headers.find((item) => item.isSorted === true)
    ?.isSortedDesc;
  useTableSortURLSync(sorted, desc, data, DEFAULT_SORTING_KEY);

  return (
    <table {...getTableProps()}>
      <thead>
        <tr
          colSpan={visibleColumns.length}
          style={{
            textAlign: 'left',
          }}
        >
          <GlobalFilter
            preGlobalFilteredRows={preGlobalFilteredRows}
            globalFilter={state.globalFilter}
            setGlobalFilter={setGlobalFilter}
          />
        </tr>

        {headerGroups.map((headerGroup) => {
          return (
            <HeadRow {...headerGroup.getHeaderGroupProps()}>
              {headerGroup.headers.map((column) => {
                const headerStyleProps = column.getHeaderProps(
                  Object.assign(column.getSortByToggleProps(), {
                    style: column.cellStyle,
                  }),
                );
                return (
                  <TableHeader {...headerStyleProps} className="th">
                    {column.render('Header')}
                    <SortCaretWrapper>
                      {column.isSorted ? (
                        column.isSortedDesc ? (
                          <i className="fas fa-sort-down" />
                        ) : (
                          <i className="fas fa-sort-up" />
                        )
                      ) : (
                        <SortIncentive>
                          <i className="fas fa-sort" />
                        </SortIncentive>
                      )}
                    </SortCaretWrapper>
                  </TableHeader>
                );
              })}
            </HeadRow>
          );
        })}
      </thead>

      <Body {...getTableBodyProps()}>
        {!rows.length && (
          <EmptyTable>
            {intl.formatMessage({ id: 'no_active_alerts' })}
          </EmptyTable>
        )}
        {rows.map((row, i) => {
          prepareRow(row);
          return (
            <HeadRow {...row.getRowProps()}>
              {row.cells.map((cell) => {
                let cellProps = cell.getCellProps({
                  style: {
                    ...cell.column.cellStyle,
                  },
                });
                if (cell.column.Header === 'Active since') {
                  return (
                    <td {...cellProps}>
                      <span>{formatDateToMid1(cell.value)}</span>
                    </td>
                  );
                } else if (cell.column.Header === 'Severity') {
                  return (
                    <td {...cellProps}>
                      <CircleStatus status={cell.value} />
                    </td>
                  );
                } else {
                  return <td {...cellProps}>{cell.render('Cell')}</td>;
                }
              })}
            </HeadRow>
          );
        })}
      </Body>
    </table>
  );
}

export default function AlertPage() {
  const alerts = useAlerts({});
  const leafAlerts = useMemo(
    () => alerts?.alerts.filter((alert) => !alert.labels.children) || [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(alerts?.alerts)],
  );

  const criticalAlerts = leafAlerts.filter(
    (alert) => alert.severity === 'critical',
  );
  const wariningAlerts = leafAlerts.filter(
    (alert) => alert.severity === 'warning',
  );

  const columns = React.useMemo(
    () => [
      {
        Header: 'Severity',
        accessor: 'severity',
        cellStyle: { textAlign: 'center', width: '100px' },
        sortType: 'severity',
      },
      {
        Header: 'Name',
        accessor: 'labels.alertname',
        cellStyle: { width: '300px' },
        sortType: 'name',
      },
      {
        Header: 'Description',
        accessor: (row) => row.description || row.summary,
      },
      {
        Header: 'Active since',
        accessor: 'startsAt',
        cellStyle: { textAlign: 'right', width: '200px' },
      },
    ],
    [],
  );

  return (
    <AlertPageContainer>
      <AlertPageHeader
        activeAlerts={leafAlerts.length}
        critical={criticalAlerts.length}
        warning={wariningAlerts.length}
      />
      <AlertContent>
        <ActiveAlertTab data={leafAlerts} columns={columns} />
      </AlertContent>
    </AlertPageContainer>
  );
}
