import React, { useState } from 'react';
import { injectIntl } from 'react-intl';
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
  const [sortBy, setSortBy] = useState('name');
  const [sortDirection, setSortDirection] = useState('ASC');

  const onSort = ({ sortBy, sortDirection }) => {
    setSortBy(sortBy);
    setSortDirection(sortDirection);
  };

  const columns = [
    {
      label: props.intl.messages.name,
      dataKey: 'name',
      flexGrow: 1
    },
    {
      label: props.intl.messages.status,
      dataKey: 'status'
    },
    {
      label: props.intl.messages.storageCapacity,
      dataKey: 'storageCapacity'
    },
    {
      label: props.intl.messages.storageClass,
      dataKey: 'storageClass'
    },
    {
      label: props.intl.messages.creationTime,
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
          sortBy={sortBy}
          sortDirection={sortDirection}
          onSort={onSort}
          onRowClick={() => {}}
        />
      </VolumeTable>
    </>
  );
};

export default injectIntl(Volumes);
