import React, { useState } from 'react';
import { connect } from 'react-redux';
import { withRouter } from 'react-router-dom';
import styled from 'styled-components';
import { injectIntl } from 'react-intl';
import { Table, Button, Loader, Breadcrumb } from '@scality/core-ui';
import { padding } from '@scality/core-ui/dist/style/theme';
import {
  deployNodeAction,
  refreshNodesAction,
  stopRefreshNodesAction
} from '../ducks/app/nodes';
import { sortSelector, useRefreshEffect } from '../services/utils';
import NoRowsRenderer from '../components/NoRowsRenderer';
import { STATUS_NOT_READY, STATUS_UNKNOWN } from '../constants.js';
import {
  BreadcrumbContainer,
  BreadcrumbLabel
} from '../components/BreadcrumbStyle';
const PageContainer = styled.div`
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: ${padding.base};
`;

const ActionContainer = styled.div`
  margin-bottom: ${padding.base};
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const TableContainer = styled.div`
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

const NodeList = props => {
  useRefreshEffect(refreshNodesAction, stopRefreshNodesAction);

  const [sortBy, setSortBy] = useState('name');
  const [sortDirection, setSortDirection] = useState('ASC');
  const { intl, history, nodes, theme } = props;
  const columns = [
    {
      label: intl.messages.name,
      dataKey: 'name',
      flexGrow: 1
    },
    {
      label: intl.messages.status,
      dataKey: 'status',
      renderer: data => <span> {intl.messages[data] || data}</span>
    },
    {
      label: intl.messages.deployment,
      dataKey: 'deployment',
      renderer: (data, rowData) => {
        if (
          (!rowData.status || rowData.status === STATUS_UNKNOWN) &&
          !rowData.jid
        ) {
          return (
            <span className="status">
              <Button
                text={intl.messages.deploy}
                onClick={event => {
                  event.stopPropagation();
                  props.deployNode(rowData);
                }}
                size="smaller"
              />
            </span>
          );
        }
        if (rowData.jid) {
          return (
            <span className="status">
              <Button
                text={intl.messages.deploying}
                onClick={event => {
                  event.stopPropagation();
                  history.push(`/nodes/deploy/${rowData.jid}`);
                }}
                icon={<Loader size="smaller" />}
                size="smaller"
              />
            </span>
          );
        }
        return data;
      }
    },
    {
      label: intl.messages.roles,
      dataKey: 'roles',
      flexGrow: 1
    },
    {
      label: intl.messages.version,
      dataKey: 'metalk8s_version'
    }
  ];

  const onSort = ({ sortBy, sortDirection }) => {
    setSortBy(sortBy);
    setSortDirection(sortDirection);
  };

  const onRowClick = row => {
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
          paths={[<BreadcrumbLabel>{intl.messages.nodes}</BreadcrumbLabel>]}
        />
      </BreadcrumbContainer>
      <ActionContainer>
        <Button
          text={intl.messages.create_new_node}
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
          onRowClick={item => {
            // FIXME we will change that behavior later
            // We want let the user click on the item only it's deployed.
            if (
              item.rowData.status !== STATUS_UNKNOWN &&
              item.rowData.status !== STATUS_NOT_READY
            ) {
              onRowClick(item);
            }
          }}
          noRowsRenderer={() => (
            <NoRowsRenderer content={intl.messages.no_data_available} />
          )}
        />
      </TableContainer>
    </PageContainer>
  );
};

function mapStateToProps(state) {
  return {
    nodes: state.app.nodes,
    theme: state.config.theme
  };
}

const mapDispatchToProps = dispatch => {
  return {
    deployNode: payload => dispatch(deployNodeAction(payload))
  };
};

export default injectIntl(
  withRouter(
    connect(
      mapStateToProps,
      mapDispatchToProps
    )(NodeList)
  )
);
