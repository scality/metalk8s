import React, { useState } from 'react';
import { injectIntl } from 'react-intl';
import styled from 'styled-components';
import { FormattedDate, FormattedTime } from 'react-intl';
import { withRouter } from 'react-router-dom';
import { Button, Table } from '@scality/core-ui';
import { padding } from '@scality/core-ui/dist/style/theme';
import NoRowsRenderer from '../components/NoRowsRenderer';
import { sortSelector } from '../services/utils';

const ButtonContainer = styled.div`
  margin-top: ${padding.small};
`;

const VolumeTable = styled.div`
  flex-grow: 1;
  margin-top: ${padding.small};
`;

const NodeVolumes = props => {
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
  const volumeSortedList = sortSelector(props.data, sortBy, sortDirection);
  return (
    <>
      <ButtonContainer>
        <Button
          text={props.intl.messages.create_new_volume}
          type="button"
          onClick={() => {
            props.history.push('createVolume');
          }}
        />
      </ButtonContainer>
      <VolumeTable>
        <Table
          list={volumeSortedList}
          columns={columns}
          disableHeader={false}
          headerHeight={40}
          rowHeight={40}
          sortBy={sortBy}
          sortDirection={sortDirection}
          onSort={onSort}
          onRowClick={() => {}}
          noRowsRenderer={() => (
            <NoRowsRenderer content={props.intl.messages.no_volume_found} />
          )}
        />
      </VolumeTable>
    </>
  );
};

export default injectIntl(withRouter(NodeVolumes));
