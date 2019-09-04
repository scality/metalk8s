import React, { useState } from 'react';
import { connect } from 'react-redux';
import { withRouter } from 'react-router-dom';
import styled from 'styled-components';
import { injectIntl } from 'react-intl';
import { Table, Button } from '@scality/core-ui';
import { padding } from '@scality/core-ui/dist/style/theme';
import { sortSelector } from '../services/utils';
import NoRowsRenderer from '../components/NoRowsRenderer';

const PageContainer = styled.div`
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: ${padding.base};
`;

const TableContainer = styled.div`
  flex-grow: 1;
`;

const VersionLabel = styled.label`
  padding: 0 5px;
`;

const ActionContainer = styled.div`
  margin-bottom: ${padding.base};
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const SolutionsList = props => {
  const [sortBy, setSortBy] = useState('name');
  const [sortDirection, setSortDirection] = useState('ASC');
  const { intl, solutions, history } = props;
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

  const onSort = ({ sortBy, sortDirection }) => {
    setSortBy(sortBy);
    setSortDirection(sortDirection);
  };

  const solutionsSortedList = sortSelector(solutions, sortBy, sortDirection);

  return (
    <PageContainer>
      <ActionContainer>
        <Button
          text={intl.messages.create_new_namespace}
          onClick={() => history.push('/namespace/create')}
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
    </PageContainer>
  );
};

function mapStateToProps(state) {
  return {
    solutions: state.config.solutions
  };
}

export default injectIntl(withRouter(connect(mapStateToProps)(SolutionsList)));
