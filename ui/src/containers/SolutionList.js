import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { useHistory } from 'react-router';
import { Formik, Form } from 'formik';
import * as yup from 'yup';
import styled from 'styled-components';
import {
  Table,
  Button,
  Breadcrumb,
  Modal,
  Input,
  Loader,
} from '@scality/core-ui';
import { padding } from '@scality/core-ui/dist/style/theme';

import { sortSelector } from '../services/utils';

import NoRowsRenderer from '../components/NoRowsRenderer';
import {
  BreadcrumbContainer,
  BreadcrumbLabel,
} from '../components/BreadcrumbStyle';
import { intl } from '../translations/IntlGlobalProvider';

const PageContainer = styled.div`
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  height: 100%;
  padding-left: ${padding.base};
`;

const PageSubtitle = styled.h3`
  color: ${(props) => props.theme.brand.textPrimary};
  margin: ${padding.small} 0;
  display: flex;
  align-items: center;
`;

const VersionLabel = styled.label`
  padding: 0 ${padding.smaller};
`;

const ModalBody = styled.div``;

const FormStyle = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding-bottom: ${padding.base};
  min-height: 220px;
  .sc-input {
    display: inline-flex;
    margin: ${padding.smaller} 0;
    justify-content: center;
    .sc-input-label {
      width: 200px;
    }
  }
`;

const ButtonContainer = styled.span`
  margin-left: ${(props) => (props.marginLeft ? '10px' : '0')};
`;

const TableContainer = styled.div`
  height: 40%;
  margin: 0 0 50px 0;
`;

const EnvironmentHeader = styled.div`
  display: flex;
  justify-content: space-between;
`;

const ActionContainer = styled.div`
  display: flex;
  justify-content: space-between;
  margin: 10px 0;
  padding: 10px 0;
`;

const SelectContainer = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  margin-top: 20px;
`;

const SolutionsList = (props) => {
  const [solutionSortBy, setSolutionSortBy] = useState('name');
  const [solutionSortDirection, setSolutionSortDirection] = useState('ASC');
  const [envSortBy, setEnvSortBy] = useState('name');
  const [envSortDirection, setEnvSortDirection] = useState('ASC');
  const [isAddSolutionModalOpen, setisAddSolutionModalOpen] = useState(false);
  const [selectedEnvironment, setSelectedEnvironment] = useState('');
  const theme = useSelector((state) => state.config.theme);
  const solutions = useSelector((state) => state.app.solutions.solutions);
  const environments = useSelector((state) => state.app.solutions.environments);
  const history = useHistory();

  const onSort = (setSortBy, setSortDirection) => ({
    sortBy,
    sortDirection,
  }) => {
    setSortBy(sortBy);
    setSortDirection(sortDirection);
  };

  const solutionColumns = [
    {
      label: intl.translate('name'),
      dataKey: 'name',
      flexGrow: 1,
    },
    {
      label: intl.translate('versions'),
      dataKey: 'versions',
      renderer: (versions) =>
        versions.map((version, index) => (
          <VersionLabel key={`version_${index}`}>
            {version.version}
          </VersionLabel>
        )),
      flexGrow: 1,
    },
  ];

  const environmentsColumn = [
    {
      label: intl.translate('name'),
      dataKey: 'name',
    },
    {
      label: intl.translate('description'),
      dataKey: 'description',
      flexGrow: 1,
    },
    {
      label: intl.translate('solutions'),
      dataKey: 'solutions',
      renderer: (solutions, row) => {
        const solutionsLinks = solutions
          .map((solution, idx) => {
            const solutionRow = sortedSolutions.find(
              (s) => s.name === solution.name,
            );

            const solutionVersion = solutionRow?.versions?.find(
              (v) => v.version === solution.version,
            );

            return solutionVersion?.ui_url ? (
              <ButtonContainer key={`solution_${idx}`} marginLeft={idx !== 0}>
                <Button
                  size="smaller"
                  text={`${solution.name} ${solution.version}`}
                  icon={<i className="fas fa-external-link-alt" />}
                  onClick={() => {
                    const url = `${solutionVersion.ui_url}/environments/${row.name}`;
                    window.open(url, '_blank');
                  }}
                ></Button>
              </ButtonContainer>
            ) : null;
          })
          .filter((solution) => solution != null);

        return (
          <div>
            <span>{solutionsLinks}</span>
            <ButtonContainer marginLeft={solutionsLinks.length !== 0}>
              <Button
                size="smaller"
                icon={<i className="fas fa-plus" />}
                onClick={() => {
                  setSelectedEnvironment(row.name);
                  setisAddSolutionModalOpen(true);
                }}
              />
            </ButtonContainer>
          </div>
        );
      },
      flexGrow: 1,
    },
  ];

  const sortedSolutions =
    sortSelector(solutions, solutionSortBy, solutionSortDirection) ?? [];

  const sortedEnvironments =
    sortSelector(environments, envSortBy, envSortDirection) ?? [];

  const formattedEnvironments = sortedEnvironments.map((environment) => {
    return {
      name: environment?.metadata?.name ?? '',
      description: environment?.spec?.description ?? '',
      solutions: environment?.spec?.solutions ?? [],
    };
  });

  const firstSolution = (sortedSolutions[0] && sortedSolutions[0].name) ?? '';
  const firstVersion = sortedSolutions?.[0]?.versions?.[0]?.version ?? '';

  const initialValues = {
    solution: { label: firstSolution, value: firstSolution },
    version: { label: firstVersion, value: firstVersion },
  };

  const validationSchema = {
    solution: yup
      .object()
      .shape({
        label: yup.string().required(),
        value: yup.string().required(),
      })
      .required(),
    version: yup
      .object()
      .shape({
        label: yup.string().required(),
        value: yup.string().required(),
      })
      .required(),
  };

  const isSolutionReady = sortedSolutions.length > 0;

  return (
    <>
      <PageContainer>
        <BreadcrumbContainer>
          <Breadcrumb
            activeColor={theme.brand.secondary}
            paths={[
              <BreadcrumbLabel title={intl.translate('solutions')}>
                {intl.translate('solutions')}
              </BreadcrumbLabel>,
            ]}
          />
        </BreadcrumbContainer>
        <TableContainer>
          <EnvironmentHeader>
            <PageSubtitle>{intl.translate('environments')}</PageSubtitle>
            <Button
              text={intl.translate('create_new_environment')}
              onClick={() => history.push('/solutions/create-environment')}
              icon={<i className="fas fa-plus" />}
            />
          </EnvironmentHeader>

          <Table
            list={formattedEnvironments}
            columns={environmentsColumn}
            disableHeader={false}
            headerHeight={40}
            rowHeight={40}
            sortBy={envSortBy}
            sortDirection={envSortDirection}
            onSort={onSort(setEnvSortBy, setEnvSortDirection)}
            onRowClick={() => {}}
            noRowsRenderer={() => (
              <NoRowsRenderer content={intl.translate('no_data_available')} />
            )}
          />
        </TableContainer>

        <TableContainer>
          <PageSubtitle>{intl.translate('available_solutions')}</PageSubtitle>
          <Table
            list={sortedSolutions}
            columns={solutionColumns}
            disableHeader={false}
            headerHeight={40}
            rowHeight={40}
            sortBy={solutionSortBy}
            sortDirection={solutionSortDirection}
            onSort={onSort(setSolutionSortBy, setSolutionSortDirection)}
            onRowClick={() => {}}
            noRowsRenderer={() => (
              <NoRowsRenderer content={intl.translate('no_data_available')} />
            )}
          />
        </TableContainer>
      </PageContainer>

      <Modal
        close={() => {
          setisAddSolutionModalOpen(false);
          setSelectedEnvironment('');
        }}
        isOpen={isAddSolutionModalOpen}
        title={intl.translate('add_solution_to_environment', {
          environment: selectedEnvironment,
        })}
      >
        {isSolutionReady ? (
          <Formik
            initialValues={initialValues}
            validationSchema={validationSchema}
            onSubmit={(values) => {
              const selectedSolution = sortedSolutions.find(
                (solution) => solution.name === values.solution.value,
              );

              const selectedVersion = selectedSolution.versions.find(
                (version) => version.version === values.version.value,
              );

              if (
                selectedVersion.ui_url &&
                selectedEnvironment &&
                selectedVersion.version
              ) {
                const url = `${selectedVersion.ui_url}/environments/${selectedEnvironment}/version/${selectedVersion.version}/prepare`;
                window.open(url, '_blank');
              }
            }}
          >
            {(formikProps) => {
              const { setFieldValue, values } = formikProps;

              const handleSelectChange = (field) => (selectedObj) => {
                setFieldValue(field, selectedObj ? selectedObj : '');
              };

              const solutionsSelectOptions = sortedSolutions.map(
                (solution) => ({
                  label: solution.name,
                  value: solution.name,
                }),
              );

              const selectedSolutionVersions =
                sortedSolutions.find(
                  (solution) => solution.name === values.solution.value,
                )?.versions ?? [];

              const selectedSolutionVersionsOptions = selectedSolutionVersions.map(
                (solutionVersion) => ({
                  label: solutionVersion.version,
                  value: solutionVersion.version,
                }),
              );

              return (
                <ModalBody>
                  <Form>
                    <FormStyle>
                      <SelectContainer>
                        <Input
                          type="select"
                          name="solutions"
                          label={intl.translate('solutions')}
                          options={solutionsSelectOptions}
                          placeholder={intl.translate('select_a_type')}
                          noOptionsMessage={() => intl.translate('no_results')}
                          onChange={handleSelectChange('solution')}
                          value={values.solution}
                        />
                        <Input
                          type="select"
                          name="version"
                          label={intl.translate('version_env')}
                          options={selectedSolutionVersionsOptions}
                          placeholder={intl.translate('select_a_type')}
                          noOptionsMessage={() => intl.translate('no_results')}
                          onChange={handleSelectChange('version')}
                          value={values.version}
                        />
                      </SelectContainer>

                      <ActionContainer>
                        <Button
                          outlined
                          text={intl.translate('cancel')}
                          onClick={() => {
                            setisAddSolutionModalOpen(false);
                            setSelectedEnvironment('');
                          }}
                        />
                        <Button
                          text={intl.translate('add_solution')}
                          type="submit"
                        />
                      </ActionContainer>
                    </FormStyle>
                  </Form>
                </ModalBody>
              );
            }}
          </Formik>
        ) : (
          <Loader size="large">{intl.translate('import_solution_hint')}</Loader>
        )}
      </Modal>
    </>
  );
};

export default SolutionsList;
