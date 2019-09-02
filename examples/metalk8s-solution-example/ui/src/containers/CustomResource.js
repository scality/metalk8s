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

const ActionContainer = styled.div`
  margin-bottom: ${padding.base};
  display: flex;
  align-items: center;
  .sc-button {
    margin-right: 15px;
  }
`;

const TableContainer = styled.div`
  flex-grow: 1;
  display: flex;
`;

const CustomResource = props => {
  const [sortByCR, setSortByCR] = useState('name');
  const [sortDirectionCR, setSortDirectionCR] = useState('ASC');
  const { intl, history, customResource } = props;
  const columns = [
    {
      label: intl.messages.name,
      dataKey: 'name',
      flexGrow: 1
    },
    {
      label: intl.messages.namespace,
      dataKey: 'namespace',
      flexGrow: 1
    },
    {
      label: intl.messages.replicas,
      dataKey: 'replicas'
    },
    {
      label: intl.messages.version,
      dataKey: 'version'
    }
  ];

  const onSortCR = ({ sortBy, sortDirection }) => {
    setSortByCR(sortBy);
    setSortDirectionCR(sortDirection);
  };

  const customResourceSortedList = sortSelector(
    customResource.list,
    sortByCR,
    sortDirectionCR
  );

  return (
    <PageContainer>
      <ActionContainer>
        <Button
          text={intl.messages.create_new_customResource}
          onClick={() => history.push('/customResource/create')}
          icon={<i className="fas fa-plus" />}
        />
      </ActionContainer>
      <TableContainer>
        <Table
          list={customResourceSortedList}
          columns={columns}
          disableHeader={false}
          headerHeight={40}
          rowHeight={40}
          sortBy={sortByCR}
          sortDirection={sortDirectionCR}
          onSort={onSortCR}
          onRowClick={row => {
            history.push(`/customResource/${row.rowData.name}/edit`);
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
    customResource: state.app.customResource
  };
}

export default injectIntl(withRouter(connect(mapStateToProps)(CustomResource)));
