import React, { useState, useEffect } from 'react';
import { connect } from 'react-redux';
import { withRouter } from 'react-router-dom';
import styled from 'styled-components';
import { injectIntl } from 'react-intl';
import { Table, Button, Loader } from '@scality/core-ui';
import { padding } from '@scality/core-ui/dist/style/theme';

import { fetchNodesAction, deployNodeAction } from '../ducks/app/nodes';
import { REFRESH_TIMEOUT } from '../constants';
import { sortSelector } from '../services/utils';
import NoRowsRenderer from '../components/NoRowsRenderer';

const PageContainer = styled.div`
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: ${padding.larger};
`;

const ActionContainer = styled.div`
  margin-bottom: ${padding.base};
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
  useEffect(() => {
    props.fetchNodes();
    let interval = setInterval(() => props.fetchNodes(), REFRESH_TIMEOUT);

    return () => {
      clearInterval(interval);
    };
  }, []);

  const [sortBy, setSortBy] = useState('name');
  const [sortDirection, setSortDirection] = useState('ASC');
  const { intl, history, nodes } = props;
  const columns = [
    {
      label: intl.messages.name,
      dataKey: 'name',
      flexGrow: 1
    },
    {
      label: intl.messages.status,
      dataKey: 'status'
    },
    {
      label: intl.messages.deployment,
      dataKey: 'deployment',
      renderer: (data, rowData) => {
        if ((!rowData.status || rowData.status === 'Unknown') && !rowData.jid) {
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

  const nodesSortedList = sortSelector(nodes, sortBy, sortDirection);

  return (
    <PageContainer>
      <ActionContainer>
        <Button
          text={intl.messages.create_new_node}
          onClick={() => history.push('/nodes/create')}
          icon={<i className="fas fa-plus" />}
        />
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
              item.rowData.status !== intl.messages.unknown &&
              item.rowData.status !== intl.messages.not_ready
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
    nodes: state.app.nodes.list
  };
}

const mapDispatchToProps = dispatch => {
  return {
    fetchNodes: () => dispatch(fetchNodesAction()),
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
