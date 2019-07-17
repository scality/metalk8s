import React from 'react';
import styled from 'styled-components';
import { Button, Table } from '@scality/core-ui';
import { padding } from '@scality/core-ui/dist/style/theme';

const VolumePageContainer = styled.div`
  margin-top: ${padding.small};
`;

const VolumeTable = styled.div`
  flex-grow: 1;
  margin-top: ${padding.small};
`;

const Volumes = () => {
  const volumes = [];

  const columns = [
    {
      label: 'Name',
      dataKey: 'name',
      flexGrow: 1
    },
    {
      label: 'Status',
      dataKey: 'status'
    },
    {
      label: 'Size',
      dataKey: 'namespace'
    },
    {
      label: 'StorageClass',
      dataKey: 'startTime'
    },
    {
      label: 'Creation Time',
      dataKey: 'namespace'
    }
  ];

  return (
    <VolumePageContainer>
      <Button text={'Create New Volume'} type="button" />
      <VolumeTable>
        <Table
          list={volumes}
          columns={columns}
          disableHeader={false}
          headerHeight={40}
          rowHeight={40}
          // sortBy={this.state.sortBy}
          // sortDirection={this.state.sortDirection}
          // onSort={this.onSort}
          onRowClick={() => {}}
        />
      </VolumeTable>
    </VolumePageContainer>
  );
};

export default Volumes;
