import React from 'react';
import { connect } from 'react-redux';
import { withRouter } from 'react-router-dom';
import memoizeOne from 'memoize-one';
import styled from 'styled-components';
import { sortBy as sortByArray } from 'lodash';
import { injectIntl, FormattedDate, FormattedTime } from 'react-intl';
import { Table, Button } from 'core-ui';
import { padding } from 'core-ui/dist/style/theme';

import { fetchNodesAction, deployNodeAction } from '../ducks/app/nodes';
import { authenticateSaltApiAction } from '../ducks/login';

const PageContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
`;

const ActionContainer = styled.div`
  margin: ${padding.base};
`;

const TableContainer = styled.div`
  flex-grow: 1;
`;

class NodeList extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      nodes: [],
      sortBy: 'name',
      sortDirection: 'ASC',
      columns: [
        {
          label: props.intl.messages.name,
          dataKey: 'name'
        },
        {
          label: props.intl.messages.status,
          dataKey: 'status'
        },
        {
          label: props.intl.messages.roles,
          dataKey: 'roles'
        },
        {
          label: props.intl.messages.cpu_capacity,
          dataKey: 'cpu'
        },
        {
          label: props.intl.messages.memory,
          dataKey: 'memory'
        },
        {
          label: props.intl.messages.creationDate,
          dataKey: 'creationDate',
          renderer: data => (
            <span>
              <FormattedDate value={data} /> <FormattedTime value={data} />
            </span>
          )
        }
      ]
    };
    this.onSort = this.onSort.bind(this);
  }

  onSort({ sortBy, sortDirection }) {
    this.setState({ sortBy, sortDirection });
  }

  onRowClick(row) {
    if (row.rowData && row.rowData.name) {
      this.props.history.push(`/nodes/${row.rowData.name}`);
    }
  }

  sortNodes = memoizeOne((nodes, sortBy, sortDirection) => {
    const sortedList = sortByArray(nodes, [
      node => {
        return typeof node[sortBy] === 'string'
          ? node[sortBy].toLowerCase()
          : node[sortBy];
      }
    ]);

    if (sortDirection === 'DESC') {
      sortedList.reverse();
    }
    return sortedList;
  });

  testSaltApi() {
    this.props.authenticateSalt({
      username: 'admin',
      password: 'admin'
    });
  }

  render() {
    const { intl } = this.props;

    const nodesSortedList = this.sortNodes(
      this.props.nodes,
      this.state.sortBy,
      this.state.sortDirection
    );

    const nodesSortedListWithRoles = nodesSortedList.map(node => {
      let roles = [];
      if (node.bootstrap) {
        roles.push(intl.messages.bootstrap);
      } else {
        if (node.control_plane) {
          roles.push(intl.messages.control_plane);
        }
        if (node.workload_plane) {
          roles.push(intl.messages.workload_plane);
        }
      }
      node.roles = roles.join(' / ');

      let statusType = node.statusType;
      let status = intl.messages.unknown;

      if (statusType && statusType.status === 'True') {
        status = intl.messages.ready;
      } else if (statusType && statusType.status === 'False') {
        status = intl.messages.not_ready;
      }
      node.status = status;
      return node;
    });

    const nodesWithActions = nodesSortedListWithRoles.map(node => {
      return {
        ...node,
        actions:
          !node.status || node.status === 'Unknown'
            ? [
                {
                  label: this.props.intl.messages.deploy,
                  onClick: this.props.deployNode
                }
              ]
            : null
      };
    });

    return (
      <PageContainer>
        <ActionContainer>
          <Button
            text={intl.messages.create_new_node}
            onClick={() => this.props.history.push('/nodes/create')}
          />
          <Button text={'test'} onClick={() => this.testSaltApi()} />
        </ActionContainer>
        <TableContainer>
          <Table
            list={nodesWithActions}
            columns={this.state.columns}
            disableHeader={false}
            headerHeight={40}
            rowHeight={40}
            sortBy={this.state.sortBy}
            sortDirection={this.state.sortDirection}
            onSort={this.onSort}
            onRowClick={item => {
              // FIXME we will change that behavior later
              // We want let the user click on the item only it's deployed.
              if (
                item.rowData.status !== intl.messages.unknown &&
                item.rowData.status !== intl.messages.not_ready
              ) {
                this.onRowClick(item);
              }
            }}
          />
        </TableContainer>
      </PageContainer>
    );
  }
}

function mapStateToProps(state) {
  return {
    nodes: state.app.nodes.list
  };
}

const mapDispatchToProps = dispatch => {
  return {
    fetchNodes: () => dispatch(fetchNodesAction()),
    deployNode: payload => dispatch(deployNodeAction(payload)),
    authenticateSalt: payload => dispatch(authenticateSaltApiAction(payload))
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
