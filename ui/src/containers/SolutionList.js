import React, { useState, useEffect } from 'react';
import { connect } from 'react-redux';
import { withRouter } from 'react-router-dom';
import styled from 'styled-components';
import { injectIntl } from 'react-intl';
import { Table, Button } from '@scality/core-ui';
import { padding } from '@scality/core-ui/dist/style/theme';
import Joyride from 'react-joyride';

import { sortSelector, useRefreshEffect } from '../services/utils';
import NoRowsRenderer from '../components/NoRowsRenderer';
import {
  refreshNamespacesAction,
  stopRefreshNamespacesAction
} from '../ducks/app/namespaces';

const SOLUTIONS_GUIDED_TOUR_DONE = 'SOLUTIONS_GUIDED_TOUR_DONE';

const PageContainer = styled.div`
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: ${padding.base};
`;

const TableContainer = styled.div`
  flex-grow: 1;
  height: 300px;
  padding: 0 ${padding.larger} ${padding.larger} ${padding.larger};
`;

const SmallTableContainer = styled(TableContainer)`
  width: 500px;
`;

const VersionLabel = styled.label`
  padding: 0 5px;
`;

const ActionContainer = styled.div`
  margin: 0 ${padding.larger} ${padding.base} ${padding.larger};
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const StepContent = styled.div`
  text-align: start;
`;

const SolutionsList = props => {
  useRefreshEffect(refreshNamespacesAction, stopRefreshNamespacesAction);
  useEffect(() => {
    const hasGuidedTourRun = JSON.parse(
      localStorage.getItem(SOLUTIONS_GUIDED_TOUR_DONE)
    );
    if (!hasGuidedTourRun) {
      setGuidedTourRun(true);
      localStorage.setItem(SOLUTIONS_GUIDED_TOUR_DONE, true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [sortBy, setSortBy] = useState('name');
  const [sortDirection, setSortDirection] = useState('ASC');
  const [namespacesSortBy, setNamespacesSortBy] = useState('name');
  const [namespacesSortDirection, setNamespacesSortDirection] = useState('ASC');
  const [guidedTourRun, setGuidedTourRun] = useState(false);

  const { intl, solutions, namespaces, history } = props;
  const columns = [
    {
      label: intl.messages.name,
      dataKey: 'name',
      flexGrow: 1
    },
    {
      label: intl.messages.versions,
      dataKey: 'versions',
      renderer: versions =>
        versions.map((version, index) => (
          <VersionLabel key={`version_${index}`}>
            {version.version}
          </VersionLabel>
        )),
      flexGrow: 1
    },
    {
      label: intl.messages.deployed_version,
      dataKey: 'versions',
      renderer: versions =>
        versions.map((version, index) => {
          return version.deployed && version.ui_url ? (
            <a href={version.ui_url} key={`deployed_version_${index}`}>
              {version.version}
            </a>
          ) : null;
        }),
      flexGrow: 1
    }
  ];

  const namespacesColumns = [
    {
      label: intl.messages.name,
      dataKey: 'displayName',
      flexGrow: 1
    },
    {
      label: intl.messages.status,
      dataKey: 'status'
    }
  ];

  const onSort = ({ sortBy, sortDirection }) => {
    setSortBy(sortBy);
    setSortDirection(sortDirection);
  };

  const onNamespacesSort = ({ sortBy, sortDirection }) => {
    setNamespacesSortBy(sortBy);
    setNamespacesSortDirection(sortDirection);
  };
  const solutionsSortedList = sortSelector(solutions, sortBy, sortDirection);
  const namespacesSortedList = sortSelector(
    namespaces,
    namespacesSortBy,
    namespacesSortDirection
  );

  const steps = [
    {
      target: '#sidepanel_solutions-button',
      content: (
        <StepContent>
          <h3>What is a Solution?</h3>
          <span>
            A Solution is a packaged Kubernetes application, archived as an ISO
            disk image, containing:
          </span>
          <ul>
            <li>A set of OCI images to inject in MetalK8s image registry </li>
            <li>An Operator to deploy on the cluster </li>
            <li>
              Optionally, a UI for managing and monitoring the application,
              represented by a standard Kubernetes Deployment
            </li>
          </ul>
          <h3>How to import a Solution in Metalk8s?</h3>
          <ul>
            <li>Import the Solution</li>
            <li>Create a namespace</li>
          </ul>
        </StepContent>
      ),
      placement: 'right',
      disableBeacon: true
    },
    {
      target: '#import_solution_button',
      content: (
        <StepContent>
          <h3>Import the Solution</h3>
          <span>To import a Solution, follow these below steps:</span>
          <ul>
            <li>
              Make Solution ISO archive available in the MetalK8s cluster{' '}
            </li>
            <li>
              Click "Import Solution" in the UI to select a version to import
            </li>
          </ul>
        </StepContent>
      ),
      placement: 'right'
    },
    {
      target: '#create_namespace_button',
      content: (
        <StepContent>
          <h3>Create a namespace</h3>
          <span>To create a Solution instance, a namespace is required</span>
        </StepContent>
      ),
      placement: 'right'
    }
  ];
  return (
    <PageContainer>
      <Joyride
        continuous={true}
        showProgress={true}
        showSkipButton={true}
        steps={steps}
        run={guidedTourRun}
      />
      <ActionContainer>
        <Button
          id="import_solution_button"
          text={intl.messages.import_solution}
          onClick={() => history.push('/solutions/import')}
          icon={<i className="fas fa-plus" />}
        />
      </ActionContainer>
      <TableContainer>
        <Table
          list={solutionsSortedList}
          columns={columns}
          disableHeader={false}
          headerHeight={40}
          rowHeight={40}
          sortBy={sortBy}
          sortDirection={sortDirection}
          onSort={onSort}
          onRowClick={() => {}}
          noRowsRenderer={() => (
            <NoRowsRenderer content={intl.messages.no_solution_available} />
          )}
        />
      </TableContainer>
      <ActionContainer>
        <Button
          id="create_namespace_button"
          text={intl.messages.create_new_namespace}
          onClick={() => history.push('/namespace/create')}
          icon={<i className="fas fa-plus" />}
        />
      </ActionContainer>
      <SmallTableContainer>
        <Table
          list={namespacesSortedList}
          columns={namespacesColumns}
          disableHeader={false}
          headerHeight={40}
          rowHeight={40}
          sortBy={namespacesSortBy}
          sortDirection={namespacesSortDirection}
          onSort={onNamespacesSort}
          onRowClick={() => {}}
          noRowsRenderer={() => (
            <NoRowsRenderer content={intl.messages.no_namespace_available} />
          )}
        />
      </SmallTableContainer>
    </PageContainer>
  );
};

function mapStateToProps(state) {
  return {
    solutions: state.config.solutions,
    namespaces: state.app.namespaces.list
  };
}

export default injectIntl(withRouter(connect(mapStateToProps)(SolutionsList)));
