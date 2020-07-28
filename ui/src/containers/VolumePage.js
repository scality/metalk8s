import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useRouteMatch, useHistory } from 'react-router';
import styled from 'styled-components';
import Loader from '../components/Loader';
import {
  fontSize,
  padding,
  fontWeight,
} from '@scality/core-ui/dist/style/theme';
import { Breadcrumb, Button, ProgressBar, Tooltip } from '@scality/core-ui';
import ActiveAlertsCard from '../components/ActiveAlertsCard';
import VolumeDetailCard from './VolumeDetailCard';
import PerformanceGraphCard from '../components/PerformanceGraphCard';
import CircleStatus from '../components/CircleStatus';
import {
  useTable,
  useFilters,
  useGlobalFilter,
  useAsyncDebounce,
  useRowSelect,
} from 'react-table';
import { fetchPodsAction } from '../ducks/app/pods';
import { refreshNodesAction, stopRefreshNodesAction } from '../ducks/app/nodes';
import {
  makeGetNodeFromUrl,
  makeGetPodsFromUrl,
  makeGetVolumesFromUrl,
  useRefreshEffect,
  allSizeUnitsToBytes,
  jointDataPointBaseonTimeSeries,
  addMissingDataPoint,
} from '../services/utils';
import { SPARSE_LOOP_DEVICE, RAW_BLOCK_DEVICE } from '../constants';
import {
  refreshVolumesAction,
  stopRefreshVolumesAction,
  refreshPersistentVolumesAction,
  stopRefreshPersistentVolumesAction,
  fetchPersistentVolumeClaimAction,
} from '../ducks/app/volumes';
import {
  refreshVolumeStatsAction,
  refreshAlertsAction,
  stopRefreshAlertsAction,
} from '../ducks/app/monitoring';
import {
  BreadcrumbContainer,
  BreadcrumbLabel,
  StyledLink,
} from '../components/BreadcrumbStyle';
import {
  computeVolumeGlobalStatus,
  getVolumeListData,
} from '../services/NodeVolumesUtils';
import { intl } from '../translations/IntlGlobalProvider';

// should be extracted to the common style, need to change the position of other's breadcrumb
const PageContainer = styled.div`
  display: flex;
  box-sizing: border-box;
  height: 100%;
  flex-wrap: wrap;
`;

const VolumeContent = styled.div`
  display: flex;
  flex-direction: row;
  height: 100%;
  background-color: ${(props) => props.theme.brand.primary};
`;

const LeftSideVolumeList = styled.div`
  flex-direction: column;
  min-height: 696px;
  width: 44vw;
`;

const VolumeListContainer = styled.div`
  color: ${(props) => props.theme.brand.textPrimary};
  padding: 1rem;
  font-family: 'Lato';
  font-size: ${fontSize.base};
  border-color: #2c3137;
  .sc-progressbarcontainer {
    width: 84px;
  }
  table {
    border-spacing: 0;
    .sc-select-container {
      width: 120px;
      height: 10px;
    }
    tr {
      :last-child {
        td {
          border-bottom: 0;
          font-weight: normal;
        }
      }
    }

    th {
      font-weight: bold;
      height: 56px;
      text-align: left;
    }

    td {
      margin: 0;
      padding: 0.5rem;
      border-bottom: 1px solid black;
      text-align: left;
      padding: 5px 5px 5px 0;

      :last-child {
        border-right: 0;
      }
    }
  }
`;

const TableRow = styled.tr`
  &:hover,
  &:focus {
    background-color: ${(props) => props.theme.brand.backgroundBluer};
    border-top: 1px solid ${(props) => props.theme.brand.secondary};
    border-bottom: 1px solid ${(props) => props.theme.brand.secondary};
    outline: none;
    cursor: pointer;
  }
`;

const RightSidePanel = styled.div`
  flex-direction: column;
  width: 50vw;
  /* Make it scrollable for the small laptop screen */
  overflow-y: scroll;
`;

// ActionContainer for the volume table
const ActionContainer = styled.span`
  display: flex;
`;

const CreateVolumeButton = styled(Button)`
  margin-left: ${padding.larger};
`;

const TooltipContent = styled.div`
  color: ${(props) => props.theme.brand.textSecondary};
  font-weight: ${fontWeight.bold};
  width: 60px;
`;

const VolumePage = (props) => {
  const match = useRouteMatch();
  const history = useHistory();
  const dispatch = useDispatch();

  useRefreshEffect(refreshNodesAction, stopRefreshNodesAction);
  useRefreshEffect(refreshVolumesAction, stopRefreshVolumesAction);
  useRefreshEffect(
    refreshPersistentVolumesAction,
    stopRefreshPersistentVolumesAction,
  );
  useEffect(() => {
    dispatch(fetchPodsAction());
    dispatch(refreshVolumeStatsAction());
    dispatch(fetchPersistentVolumeClaimAction());
  }, [dispatch]);
  useEffect(() => {
    dispatch(refreshAlertsAction());
    return () => dispatch(stopRefreshAlertsAction());
  }, [dispatch]);

  const theme = useSelector((state) => state.config.theme);
  const pods = useSelector((state) => makeGetPodsFromUrl(state, props));
  const node = useSelector((state) => makeGetNodeFromUrl(state, props));
  const volumes = useSelector((state) => makeGetVolumesFromUrl(state, props));
  const pVList = useSelector((state) => state.app.volumes.pVList);
  const alerts = useSelector((state) => state.app.monitoring.alert);

  const volumeUsedList = useSelector(
    (state) => state.app.monitoring.volumeStats.volumeUsed,
  );
  const volumeThroughputWriteList = useSelector(
    (state) => state.app.monitoring.volumeStats.volumeThroughputWrite,
  );
  const volumeThroughputReadList = useSelector(
    (state) => state.app.monitoring.volumeStats.volumeThroughputRead,
  );
  const volumeLatencyList = useSelector(
    (state) => state.app.monitoring.volumeStats.volumeLatency,
  );
  const volumeIOPSReadList = useSelector(
    (state) => state.app.monitoring.volumeStats.volumeIOPSRead,
  );
  const volumeIOPSWriteList = useSelector(
    (state) => state.app.monitoring.volumeStats.volumeIOPSWrite,
  );
  const queryStartingTime = useSelector(
    (state) => state.app.monitoring.volumeStats.queryStartingTime,
  );

  // Should be the selected volume from the volume list
  const [currentVolumeName, setCurrentVolumeName] = useState(
    match.params.volumeName,
  );
  const [searchedVolumeName, setSearchedVolumeName] = useState('');

  const pV = pVList.find((pv) => pv.metadata.name === currentVolumeName);
  const volume = volumes.find(
    (volume) => volume.metadata.name === currentVolumeName,
  );

  const volumeStatus = computeVolumeGlobalStatus(
    volume?.metadata?.name,
    volume?.status,
  );

  // in order to get the used pod(s)
  const PVCName = pV?.spec?.claimRef?.name;
  const UsedPod = pods.find((pod) =>
    pod.volumes.find((volume) => volume.persistentVolumeClaim === PVCName),
  );

  // get the alert base on the current
  const alertlist = alerts?.list?.filter(
    (alert) => alert.labels.persistentvolumeclaim === PVCName,
  );

  const volumeListData = useSelector((state) =>
    getVolumeListData(state, props),
  );

  const currentVolume = volumeListData?.find(
    (vol) => vol.name === currentVolumeName,
  );

  // Todo: should be extracted outside VolumePage
  // Define a default UI for filtering
  function GlobalFilter({
    preGlobalFilteredRows,
    globalFilter,
    setGlobalFilter,
  }) {
    const count = preGlobalFilteredRows.length;
    const [value, setValue] = React.useState(globalFilter);

    const onChange = useAsyncDebounce((value) => {
      setGlobalFilter(value || undefined);
      setSearchedVolumeName(value);
    }, 500);

    return (
      <ActionContainer>
        <input
          value={value || undefined}
          onChange={(e) => {
            setValue(e.target.value);
            onChange(e.target.value);
          }}
          placeholder={`Search`}
          style={{
            fontSize: '1.1rem',
            color: '#ffffff',
            border: 'solid 1px #3b4045',
            width: '223px',
            height: '28px',
            borderRadius: '4px',
            backgroundColor: '#141416',
            fontFamily: 'Lato',
            fontStyle: 'italic',
            opacity: '0.5',
            lineHeight: '1.43',
            letterSpacing: 'normal',
            paddingLeft: '10px',
          }}
        />
        <CreateVolumeButton
          size="small"
          variant="secondary"
          text={intl.translate('create_new_volume')}
          icon={<i className="fas fa-plus-circle"></i>}
          onClick={() => {
            history.push(`/nodes/${node.name}/createVolume`);
          }}
        />
      </ActionContainer>
    );
  }

  // React Table for the volume list
  function Table({ columns, data, getTrProps }) {
    // Use the state and functions returned from useTable to build your UI
    const defaultColumn = React.useMemo(
      () => ({
        Filter: GlobalFilter,
      }),
      [],
    );

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
      state: { selectedRowIds },
    } = useTable(
      {
        columns,
        data,
        initialState: { globalFilter: searchedVolumeName },
        defaultColumn,
        getTrProps,
      },
      useFilters,
      useGlobalFilter,
      useRowSelect,
    );

    // Render the UI for your table
    return (
      <>
        <table {...getTableProps()}>
          <thead>
            {/* The first row should be the search bar */}
            <tr>
              <th
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
              </th>
            </tr>
            {headerGroups.map((headerGroup) => (
              <tr {...headerGroup.getHeaderGroupProps()}>
                {headerGroup.headers.map((column) => (
                  <th {...column.getHeaderProps()}>
                    {column.render('Header')}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody {...getTableBodyProps()}>
            {rows.map((row, i) => {
              prepareRow(row);
              return (
                <TableRow {...row.getRowProps({ onClick: () => rowInfo(row) })}>
                  {row.cells.map((cell) => {
                    if (
                      cell.column.Header === 'Usage' &&
                      cell.value !== intl.translate('unknown')
                    ) {
                      return (
                        <td {...cell.getCellProps()}>
                          <ProgressBar
                            size="base"
                            percentage={cell.value}
                            buildinLabel={`${cell.value}%`}
                          />
                        </td>
                      );
                    } else if (cell.column.Header === 'Status') {
                      // Display the icon based on the computation of volume status and volume bound
                      // Exclamation: Failed + Unbound => get the reason
                      // Unlink: Available + Unbound
                      // Link: Available + Bound

                      // volume name: cell.row.values.name
                      const volume = volumes.find(
                        (vol) => vol.metadata.name === cell.row.values.name,
                      );
                      switch (cell.value) {
                        case 'exclamation':
                          return (
                            <td {...cell.getCellProps()}>
                              <Tooltip
                                placement="top"
                                overlay={
                                  <TooltipContent>
                                    {volume.status.conditions[0].reason}
                                  </TooltipContent>
                                }
                              >
                                <i className="fas fa-exclamation"></i>
                              </Tooltip>
                            </td>
                          );
                        case 'link':
                          return (
                            <td {...cell.getCellProps()}>
                              <Tooltip
                                placement="top"
                                overlay={
                                  <TooltipContent>In use</TooltipContent>
                                }
                              >
                                <i className="fas fa-link"></i>
                              </Tooltip>
                            </td>
                          );
                        case 'unlink':
                          return (
                            <td {...cell.getCellProps()}>
                              <Tooltip
                                placement="top"
                                overlay={
                                  <TooltipContent>Unused</TooltipContent>
                                }
                              >
                                <i className="fas fa-unlink"></i>
                              </Tooltip>
                            </td>
                          );
                        default:
                          console.error('New conditions');
                      }
                    } else if (cell.column.Header === 'Health') {
                      return (
                        <td {...cell.getCellProps()}>
                          <CircleStatus
                            className="fas fa-circle"
                            status={cell.value}
                          />
                        </td>
                      );
                    } else {
                      return (
                        <td {...cell.getCellProps()}>{cell.render('Cell')}</td>
                      );
                    }
                  })}
                </TableRow>
              );
            })}
          </tbody>
        </table>
      </>
    );
  }

  const columns = React.useMemo(() => [
    { Header: 'Name', accessor: 'name' },
    { Header: 'Node', accessor: 'node' },
    { Header: 'Usage', accessor: 'usage' },
    { Header: 'Size', accessor: 'storageCapacity' },
    { Header: 'Health', accessor: 'health' },
    { Header: 'Status', accessor: 'status' },
    { Header: 'Created', accessor: 'creationTime' },
    { Header: 'Latency', accessor: 'latency' },
  ]);

  // hangle the change of volume
  const rowInfo = (rowobject) => {
    setCurrentVolumeName(rowobject.values.name);
    history.push(`/nodes/${node.name}/volumes/${rowobject.values.name}`);
  };

  // Hardcode the port number for prometheus metrics
  const instance = node?.internalIP + `:9100`;
  // filter the query according instance and deviceName
  // should extract an util function here, given the instance and device as input
  const volumeThroughputRead = volumeThroughputReadList?.filter(
    (vTR) =>
      vTR.metric.instance === instance &&
      vTR.metric.device === volume?.status?.deviceName,
  );
  const volumeThroughputWrite = volumeThroughputWriteList?.filter(
    (vTW) =>
      vTW.metric.instance === instance &&
      vTW.metric.device === volume?.status?.deviceName,
  );
  const volumeLatency = volumeLatencyList?.filter(
    (vL) =>
      vL.metric.instance === instance &&
      vL.metric.device === volume?.status?.deviceName,
  );
  const volumeIOPSRead = volumeIOPSReadList?.filter(
    (vIOPSR) =>
      vIOPSR.metric.instance === instance &&
      vIOPSR.metric.device === volume?.status?.deviceName,
  );
  const volumeIOPSWrite = volumeIOPSWriteList?.filter(
    (vIOPSW) =>
      vIOPSW.metric.instance === instance &&
      vIOPSW.metric.device === volume?.status?.deviceName,
  );
  const volumeUsed = volumeUsedList?.filter(
    (vU) => vU.metric.persistentvolumeclaim === PVCName,
  );

  return currentVolumeName && volume ? (
    <PageContainer>
      {/* There are two cases could be redirected to the Volume Page. */}
      <BreadcrumbContainer>
        {node.name !== undefined ? (
          <Breadcrumb
            activeColor={theme.brand.secondary}
            paths={[
              <BreadcrumbLabel title={intl.translate('platform')}>
                {intl.translate('platform')}
              </BreadcrumbLabel>,
              <StyledLink to="/nodes">{intl.translate('nodes')}</StyledLink>,
              <StyledLink to={`/nodes/${node.name}`} title={node.name}>
                {node.name}
              </StyledLink>,
              <BreadcrumbLabel title={intl.translate('volumes')}>
                {intl.translate('volumes')}
              </BreadcrumbLabel>,
            ]}
          />
        ) : (
          <Breadcrumb
            activeColor={theme.brand.secondary}
            paths={[
              <BreadcrumbLabel title={intl.translate('platform')}>
                {intl.translate('platform')}
              </BreadcrumbLabel>,
              <BreadcrumbLabel title={intl.translate('volumes')}>
                {intl.translate('volumes')}
              </BreadcrumbLabel>,
            ]}
          />
        )}
      </BreadcrumbContainer>
      <VolumeContent>
        <LeftSideVolumeList>
          <VolumeListContainer>
            <Table columns={columns} data={volumeListData} rowInfo={rowInfo} />
          </VolumeListContainer>
        </LeftSideVolumeList>
        <RightSidePanel>
          <VolumeDetailCard
            name={currentVolumeName}
            nodeName={volume?.spec?.nodeName}
            storage={pV?.spec?.capacity?.storage ?? intl.translate('unknown')}
            status={volumeStatus ?? intl.translate('unknown')}
            storageClassName={volume?.spec?.storageClassName}
            creationTimestamp={volume?.metadata?.creationTimestamp}
            volumeType={
              volume?.spec?.rawBlockDevice
                ? RAW_BLOCK_DEVICE
                : SPARSE_LOOP_DEVICE
            }
            usedPodName={UsedPod?.name}
            devicePath={
              volume?.spec?.rawBlockDevice?.devicePath ??
              intl.translate('not_applicable')
            }
            volumeUsagePercentage={currentVolume?.usage}
            volumeUsageBytes={currentVolume?.usageRawData ?? 0}
            storageCapacity={
              volumeListData?.find((vol) => vol.name === currentVolumeName)
                .storageCapacity
            }
            health={
              volumeListData?.find((vol) => vol.name === currentVolumeName)
                .health
            }
          ></VolumeDetailCard>
          <ActiveAlertsCard
            alertlist={alertlist}
            PVCName={PVCName}
          ></ActiveAlertsCard>
          <PerformanceGraphCard
            volumeUsed={
              volumeUsed?.length
                ? addMissingDataPoint(
                    jointDataPointBaseonTimeSeries(volumeUsed),
                    queryStartingTime,
                    7,
                    1,
                  )
                : null
            }
            volumeStorageCapacity={allSizeUnitsToBytes(
              pV?.spec?.capacity?.storage,
            )}
            volumeLatency={
              volumeLatency
                ? addMissingDataPoint(
                    jointDataPointBaseonTimeSeries(volumeLatency),
                    queryStartingTime,
                    7,
                    1,
                  )
                : null
            }
            volumeThroughputWrite={
              volumeThroughputWrite
                ? addMissingDataPoint(
                    jointDataPointBaseonTimeSeries(volumeThroughputWrite),
                    queryStartingTime,
                    7,
                    1,
                  )
                : null
            }
            volumeThroughputRead={
              volumeThroughputRead
                ? addMissingDataPoint(
                    jointDataPointBaseonTimeSeries(volumeThroughputRead),
                    queryStartingTime,
                    7,
                    1,
                  )
                : null
            }
            volumeIOPSRead={
              volumeIOPSRead
                ? addMissingDataPoint(
                    jointDataPointBaseonTimeSeries(volumeIOPSRead),
                    queryStartingTime,
                    7,
                    1,
                  )
                : null
            }
            volumeIOPSWrite={
              volumeIOPSWrite
                ? addMissingDataPoint(
                    jointDataPointBaseonTimeSeries(volumeIOPSWrite),
                    queryStartingTime,
                    7,
                    1,
                  )
                : null
            }
          ></PerformanceGraphCard>
          }
        </RightSidePanel>
      </VolumeContent>
    </PageContainer>
  ) : (
    <Loader />
  );
};

export default VolumePage;
