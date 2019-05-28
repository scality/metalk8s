import React from 'react';
import { connect } from 'react-redux';
import { withRouter } from 'react-router-dom';
import memoizeOne from 'memoize-one';
import styled from 'styled-components';
import { sortBy as sortByArray } from 'lodash';
import { injectIntl } from 'react-intl';
import { Table, Button, Loader } from 'core-ui';
import { padding } from 'core-ui/dist/style/theme';

import { fetchNodesAction, deployNodeAction } from '../ducks/app/nodes';

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
          label: props.intl.messages.deployment,
          dataKey: 'deployment',
          flexGrow: 1,
          renderer: (data, rowData) => {
            if (
              (!rowData.status || rowData.status === 'Unknown') &&
              !rowData.jid
            ) {
              return (
                <span className="status">
                  <Button
                    text={this.props.intl.messages.deploy}
                    onClick={event => {
                      event.stopPropagation();
                      this.props.deployNode(rowData);
                    }}
                    size="smaller"
                  />
                  {data && (
                    <span>
                      {data.success
                        ? props.intl.messages.success
                        : `${data.step_id} : ${data.comment}`}
                    </span>
                  )}
                </span>
              );
            }
            if (rowData.jid) {
              return (
                <span className="status">
                  <Button
                    text={this.props.intl.messages.deploying}
                    onClick={event => {
                      event.stopPropagation();
                      this.props.history.push(`/nodes/deploy/${rowData.jid}`);
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
          label: props.intl.messages.roles,
          dataKey: 'roles',
          flexGrow: 1
        },
        {
          label: props.intl.messages.version,
          dataKey: 'metalk8s_version',
          width: 200
        }
      ]
    };
    this.onSort = this.onSort.bind(this);
  }

  componentDidMount() {
    this.props.fetchNodes();
    this.interval = setInterval(() => this.props.fetchNodes(), 10000);
  }

  componentWillUnmount() {
    clearInterval(this.interval);
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
      }
      if (node.control_plane) {
        roles.push(intl.messages.control_plane);
      }
      if (node.workload_plane) {
        roles.push(intl.messages.workload_plane);
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

    return (
      <PageContainer>
        <ActionContainer>
          <Button
            text={intl.messages.create_new_node}
            onClick={() => this.props.history.push('/nodes/create')}
          />
        </ActionContainer>
        <TableContainer>
          <Table
            list={nodesSortedListWithRoles}
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
