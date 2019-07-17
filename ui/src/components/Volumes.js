import React from 'react';
import styled from 'styled-components';
import { FormattedDate, FormattedTime } from 'react-intl';
import { Button, Table } from '@scality/core-ui';
import { padding } from '@scality/core-ui/dist/style/theme';

const ButtonContainer = styled.div`
  margin-top: ${padding.small};
`;

const VolumeTable = styled.div`
  flex-grow: 1;
  margin-top: ${padding.small};
`;

const Volumes = props => {
  // FIXME Add translation
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
      dataKey: 'creationTime',
      renderer: data => (
        <span>
          <FormattedDate value={data} />{' '}
          <FormattedTime
            hour="2-digit"
            minute="2-digit"
            second="2-digit"
            value={data}
          />
        </span>
      )
    }
  ];

  return (
    <>
      <ButtonContainer>
        <Button text={'Create New Volume'} type="button" />
      </ButtonContainer>
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
    </>
  );
};

export default Volumes;
