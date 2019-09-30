import React, { useState } from 'react';
import { connect } from 'react-redux';
import { withRouter } from 'react-router-dom';
import styled from 'styled-components';
import { injectIntl } from 'react-intl';
import { Table, Button, Modal, Input } from '@scality/core-ui';
import { padding } from '@scality/core-ui/dist/style/theme';
import { sortSelector } from '../services/utils';
import NoRowsRenderer from '../components/NoRowsRenderer';

const PageContainer = styled.div`
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: ${padding.base};

  .sc-modal-content {
    overflow: initial;
  }
`;

const TableContainer = styled.div`
  flex-grow: 1;
  display: flex;
`;

const ButtonGroup = styled.div`
  display: flex;
  justify-content: flex-end;
  .sc-button {
    margin-left: ${padding.base};
  }
`;

const ModalBody = styled.div`
  padding-bottom: ${padding.base};
`;

const ModalBodyTitle = styled.div`
  padding-bottom: ${padding.base};
`;

const Environment = props => {
  const [sortBy, setSortBy] = useState('name');
  const [sortDirection, setSortDirection] = useState('ASC');
  const [openModal, setOpenModal] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState('');
  const [selectedEnvironment, setSelectedEnvironment] = useState('');
  const { intl, history, environment, versions } = props;

  const availableVersions = versions.map(item => {
    return {
      label: item.version,
      value: item.version
    };
  });

  const columns = [
    {
      label: intl.messages.name,
      dataKey: 'name',
      flexGrow: 1
    },
    {
      label: intl.messages.status,
      dataKey: 'status'
    },
    {
      label: intl.messages.version,
      dataKey: 'version',
      renderer: (data, rowData) => {
        if (!data) {
          return (
            <Button
              text={intl.messages.add_solution}
              size="small"
              type="button"
              onClick={e => {
                e.stopPropagation();
                setSelectedEnvironment(rowData.name);
                setOpenModal(true);
              }}
            />
          );
        } else {
          return data;
        }
      }
    },
    {
      label: intl.messages.description,
      dataKey: 'description',
      flexGrow: 1
    }
  ];

  const onSort = ({ sortBy, sortDirection }) => {
    setSortBy(sortBy);
    setSortDirection(sortDirection);
  };

  const environmentSortedList = sortSelector(
    environment.list,
    sortBy,
    sortDirection
  );

  return (
    <PageContainer>
      <Modal
        close={() => {
          setSelectedEnvironment('');
          setOpenModal(false);
        }}
        isOpen={openModal}
        title={intl.messages.add_solution}
        footer={
          <ButtonGroup>
            <Button
              outlined
              text={intl.messages.cancel}
              onClick={() => {
                setSelectedEnvironment('');
                setOpenModal(false);
              }}
            />
            <Button
              text={intl.messages.add}
              onClick={e => {
                e.stopPropagation();
                history.push(
                  `/environments/${selectedEnvironment}/version/${selectedVersion.value}/prepare`
                );
              }}
            />
          </ButtonGroup>
        }
      >
        <ModalBody>
          <ModalBodyTitle>
            {intl.messages.select_a_version_to_add}
          </ModalBodyTitle>
          <Input
            label={intl.messages.version}
            clearable={false}
            type="select"
            options={availableVersions}
            placeholder={intl.messages.select_a_version}
            noResultsText={intl.messages.not_found}
            name="version"
            onChange={selectedObj => setSelectedVersion(selectedObj)}
            value={selectedVersion}
          />
        </ModalBody>
      </Modal>
      <TableContainer>
        <Table
          list={environmentSortedList}
          columns={columns}
          disableHeader={false}
          headerHeight={40}
          rowHeight={40}
          sortBy={sortBy}
          sortDirection={sortDirection}
          onSort={onSort}
          onRowClick={row => {
            history.push(`/environments/${row.rowData.name}`);
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
    environment: state.app.environment,
    versions: state.config.versions
  };
}

export default injectIntl(withRouter(connect(mapStateToProps)(Environment)));
