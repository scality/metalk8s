import React from 'react';
import styled from 'styled-components';
import { Button, Table } from '@scality/core-ui';
import { padding } from '@scality/core-ui/dist/style/theme';

const VolumePageContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  margin-top: ${padding.small};
`;

const VolumeTable = styled.div`
  flex-grow: 1;
  margin-top: ${padding.small};
`;

const Volumes = props => {
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
      dataKey: 'size'
    },
    {
      label: 'StorageClass',
      dataKey: 'storageClass'
    },
    {
      label: 'Creation Time',
      dataKey: 'creationTime'
    }
  ];

  return (
    <VolumePageContainer>
      <div>
        <Button text={'Create New Volume'} type="button" />
      </div>
      <VolumeTable>
        <Table
          list={props.data}
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
