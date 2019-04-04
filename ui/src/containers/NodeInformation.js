import React from 'react';
import { connect } from 'react-redux';
import { injectIntl, FormattedDate, FormattedTime } from 'react-intl';
import { createSelector } from 'reselect';
import { Button, Table, Steppers } from 'core-ui';
import memoizeOne from 'memoize-one';
import { sortBy as sortByArray } from 'lodash';
import styled from 'styled-components';
import { fetchPodsAction } from '../ducks/app/pods';

import { fontWeight, fontSize, padding } from 'core-ui/dist/style/theme';

const NodeInformationContainer = styled.div`
  height: 100%;
  display: flex;
  flex-direction: row;
  padding: ${padding.larger};

  .sc-steppers {
    padding: ${padding.larger} 0;
  }
`;

const PodsContainer = styled.div`
  flex-grow: 1;
  padding: ${padding.base} ${padding.larger};
`;

const InformationTitle = styled.h3`
  padding: ${padding.small} 0;
  margin: 0;
`;

const InformationSpan = styled.span`
  padding: ${padding.small} ${padding.larger};
`;

const InformationLabel = styled.span`
  font-size: ${fontSize.small};
  padding-right: ${padding.base};
`;

const InformationValue = styled.span`
  font-size: ${fontSize.base};
`;

const InformationMainValue = styled(InformationValue)`
  font-weight: ${fontWeight.bold};
`;

const LeftNodeInformationSection = styled.div`
  display: flex;
  flex-direction: column;
  padding: ${padding.base} ${padding.larger};
`;

const RightNodeInformationSection = styled(LeftNodeInformationSection)`
  flex-grow: 1;
`;

class NodeSteppers extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      activeStep: 1,
      steps: [
        {
          title: props.intl.messages.node_configuration_step1,
          content: (
            <Button
              size="small"
              text={props.intl.messages.apply}
              onClick={() => this.onClick('node_registered')}
            />
          )
        },
        {
          title: props.intl.messages.node_configuration_step2,
          content: (
            <Button
              size="small"
              text={props.intl.messages.apply}
              onClick={() => this.onClick('salt')}
            />
          )
        },
        {
          title: props.intl.messages.node_configuration_step3,
          content: (
            <Button
              size="small"
              text={props.intl.messages.apply}
              onClick={() => this.onClick('workload')}
            />
          )
        },
        {
          title: props.intl.messages.node_configuration_step4,
          content: (
            <Button
              size="small"
              text={props.intl.messages.apply}
              onClick={() => this.onClick('control')}
            />
          )
        },
        {
          title: props.intl.messages.node_configuration_step4,
          content: (
            <Button
              size="small"
              text={props.intl.messages.apply}
              onClick={() => this.onClick('etcd')}
            />
          )
        }
      ]
    };
    this.onClick = this.onClick.bind(this);
  }

  onClick = role => {
    console.log(role);
    //Call SALT API
    if (this.state.activeStep < this.state.steps.length) {
      this.setState({ activeStep: this.state.activeStep + 1 });
    }
  };

  render() {
    return (
      <Steppers steps={this.state.steps} activeStep={this.state.activeStep} />
    );
  }
}

class NodeInformation extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      pods: [],
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
          label: props.intl.messages.namespace,
          dataKey: 'namespace'
        },
        {
          label: props.intl.messages.start_time,
          dataKey: 'startTime',
          renderer: data => (
            <span>
              <FormattedDate value={data} /> <FormattedTime value={data} />
            </span>
          )
        },
        {
          label: props.intl.messages.restart,
          dataKey: 'restartCount'
        }
      ]
    };
    this.onSort = this.onSort.bind(this);
  }

  componentDidMount() {
    this.props.fetchPods();
  }

  onSort({ sortBy, sortDirection }) {
    this.setState({ sortBy, sortDirection });
  }

  sortPods = memoizeOne((pods, sortBy, sortDirection) => {
    const sortedList = sortByArray(pods, [
      pod => {
        return typeof pod[sortBy] === 'string'
          ? pod[sortBy].toLowerCase()
          : pod[sortBy];
      }
    ]);

    if (sortDirection === 'DESC') {
      sortedList.reverse();
    }
    return sortedList;
  });

  render() {
    const podsSortedList = this.sortPods(
      this.props.pods,
      this.state.sortBy,
      this.state.sortDirection
    );

    return (
      <NodeInformationContainer>
        <LeftNodeInformationSection>
          <InformationTitle>
            {this.props.intl.messages.node_configuration}
          </InformationTitle>
          <NodeSteppers {...this.props} />
        </LeftNodeInformationSection>
        <RightNodeInformationSection>
          <InformationTitle>
            {this.props.intl.messages.node_information}
          </InformationTitle>
          <InformationSpan>
            <InformationLabel>{this.props.intl.messages.name}</InformationLabel>
            <InformationMainValue>{this.props.node.name}</InformationMainValue>
          </InformationSpan>

          <InformationTitle>{this.props.intl.messages.pods}</InformationTitle>
          <PodsContainer>
            <Table
              list={podsSortedList}
              columns={this.state.columns}
              disableHeader={false}
              headerHeight={40}
              rowHeight={40}
              sortBy={this.state.sortBy}
              sortDirection={this.state.sortDirection}
              onSort={this.onSort}
              onRowClick={() => {}}
            />
          </PodsContainer>
        </RightNodeInformationSection>
      </NodeInformationContainer>
    );
  }
}

const mapStateToProps = (state, ownProps) => ({
  node: makeGetNodeFromUrl(state, ownProps),
  pods: makeGetPodsFromUrl(state, ownProps)
});

const mapDispatchToProps = dispatch => {
  return {
    fetchPods: () => dispatch(fetchPodsAction())
  };
};

const getNodeFromUrl = (state, props) => {
  const nodes = state.app.nodes.list || [];
  if (props && props.match && props.match.params && props.match.params.id) {
    return nodes.find(node => node.name === props.match.params.id) || {};
  } else {
    return {};
  }
};

const getPodsFromUrl = (state, props) => {
  const pods = state.app.pods.list || [];
  if (props && props.match && props.match.params && props.match.params.id) {
    return pods.filter(pod => pod.nodeName === props.match.params.id) || [];
  } else {
    return [];
  }
};

const makeGetNodeFromUrl = createSelector(
  getNodeFromUrl,
  node => node
);

const makeGetPodsFromUrl = createSelector(
  getPodsFromUrl,
  pods => pods
);

export default injectIntl(
  connect(
    mapStateToProps,
    mapDispatchToProps
  )(NodeInformation)
);
