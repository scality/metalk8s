//@flow

import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useHistory } from 'react-router';
import styled from 'styled-components';
import { Table, Button, Loader, Breadcrumb } from '@scality/core-ui';
import { padding } from '@scality/core-ui/dist/style/theme';
import {
  deployNodeAction,
  refreshNodesAction,
  stopRefreshNodesAction,
} from '../ducks/app/nodes';
import { sortSelector, useRefreshEffect } from '../services/utils';
import NoRowsRenderer from '../components/NoRowsRenderer';
import { API_STATUS_NOT_READY, API_STATUS_UNKNOWN } from '../constants.js';
import {
  BreadcrumbContainer,
  BreadcrumbLabel,
} from '../components/BreadcrumbStyle';
import { intl } from '../translations/IntlGlobalProvider';

const PageContainer = styled.div`
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  height: 100%;
  padding-left: ${padding.base};
`;

const ActionContainer = styled.div`
  margin-bottom: ${padding.base};
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const TableContainer = styled.div`
  height: 80%;
  flex-grow: 1;
  .status {
    display: flex;
    align-items: center;

    .deploy-icon {
      width: 12px;
      height: 12px;
    }
    .sc-button {
      margin: 0 5px;
      padding: 7px;

      .sc-button-text {
        display: flex;
        align-items: flex-start;
      }
    }
    .sc-loader {
      svg {
        width: 12px;
        height: 12px;
        fill: white;
      }
    }
  }
`;

const NodeList = () => {
  const nodes = useSelector((state) => state.app.nodes);
  const theme = useSelector((state) => state.config.theme);
  const dispatch = useDispatch();
  const deployNode = (payload) => dispatch(deployNodeAction(payload));

  useRefreshEffect(refreshNodesAction, stopRefreshNodesAction);

  const [sortBy, setSortBy] = useState('name');
  const [sortDirection, setSortDirection] = useState('ASC');
  const history = useHistory();
  const columns = [
    {
      label: intl.translate('name'),
      dataKey: 'name',
      flexGrow: 1,
    },
    {
      label: intl.translate('status'),
      dataKey: 'status',
      renderer: (data) => <span> {intl.translate(data) || data}</span>,
    },
    {
      label: intl.translate('deployment'),
      dataKey: 'deployment',
      renderer: (data, rowData) => {
        if (
          (!rowData.status || rowData.status === API_STATUS_UNKNOWN) &&
          !rowData.deploying
        ) {
          return (
            <span className="status">
              <Button
                text={intl.translate('deploy')}
                onClick={(event) => {
                  event.stopPropagation();
                  deployNode(rowData);
                }}
                size="smaller"
              />
            </span>
          );
        }
        if (rowData.deploying) {
          return (
            <span className="status">
              <Button
                text={intl.translate('deploying')}
                onClick={(event) => {
                  event.stopPropagation();
                  history.push(`/nodes/${rowData.name}/deploy`);
                }}
                icon={<Loader size="smaller" />}
                size="smaller"
              />
            </span>
          );
        }
        return data;
      },
    },
    {
      label: intl.translate('roles'),
      dataKey: 'roles',
      flexGrow: 1,
    },
    {
      label: intl.translate('version'),
      dataKey: 'metalk8s_version',
    },
  ];

  const onSort = ({ sortBy, sortDirection }) => {
    setSortBy(sortBy);
    setSortDirection(sortDirection);
  };

  const onRowClick = (row) => {
    if (row.rowData && row.rowData.name) {
      history.push(`/nodes/${row.rowData.name}`);
    }
  };

  const nodesSortedList = sortSelector(nodes.list, sortBy, sortDirection);

  return (
    <PageContainer>
      <BreadcrumbContainer>
        <Breadcrumb
          activeColor={theme.brand.secondary}
          paths={[<BreadcrumbLabel>{intl.translate('nodes')}</BreadcrumbLabel>]}
        />
      </BreadcrumbContainer>
      <ActionContainer>
        <Button
          text={intl.translate('create_new_node')}
          onClick={() => history.push('/nodes/create')}
          icon={<i className="fas fa-plus" />}
        />
        {nodes.isLoading && <Loader size="small" />}
      </ActionContainer>
      <TableContainer>
        <Table
          list={nodesSortedList}
          columns={columns}
          disableHeader={false}
          headerHeight={40}
          rowHeight={40}
          sortBy={sortBy}
          sortDirection={sortDirection}
          onSort={onSort}
          onRowClick={(item) => {
            // FIXME we will change that behavior later
            // We want let the user click on the item only it's deployed.
            if (
              item.rowData.status !== API_STATUS_UNKNOWN &&
              item.rowData.status !== API_STATUS_NOT_READY
            ) {
              onRowClick(item);
            }
          }}
          noRowsRenderer={() => (
            <NoRowsRenderer content={intl.translate('no_data_available')} />
          )}
        />
      </TableContainer>
    </PageContainer>
  );
};

export default NodeList;
