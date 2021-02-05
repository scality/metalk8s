import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useRouteMatch } from 'react-router';
import { Formik, Form } from 'formik';
import * as yup from 'yup';
import styled from 'styled-components';
import { Table, Button, Modal, Input, Loader } from '@scality/core-ui';
import { sortSelector } from '../services/utils';
import NoRowsRenderer from '../components/NoRowsRenderer';
import PageContainer from '../components/TableBasedPageStyle';
import { FormStyle, ActionContainer } from '../components/ModalFormStyle';
import { intl } from '../translations/IntlGlobalProvider';
import { useRefreshEffect } from '../services/utils';
import {
  refreshSolutionsAction,
  stopRefreshSolutionsAction,
  prepareEnvironmentAction,
} from '../ducks/app/solutions';

const SelectContainer = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  margin-top: 45px;
`;

const SolutionDetail = () => {
  const match = useRouteMatch();
  const environments = useSelector((state) => state.app.solutions.environments);
  const environment = environments.find((env) => env.name === match.params.id);
  const deployedSolutions = environment?.solutions;

  // get all the available solutions from the global redux store
  const availableSolutions = useSelector(
    (state) => state.app.solutions.solutions,
  );
  const dispatch = useDispatch();
  useRefreshEffect(refreshSolutionsAction, stopRefreshSolutionsAction);

  const [
    isUpgradeDowngradeSolutionModalOpen,
    setIsUpgradeDowngradeSolutionModalOpen,
  ] = useState(false);
  // used by the modal
  const [selectedSolName, setSelectedSolName] = useState('');
  //  `Upgrade` or `Downgrade` in order to reuse the modal
  const [upgradeOrDowngrade, setUpgradeOrDowngrade] = useState('');
  const [solSortBy, setSolSortBy] = useState('name');
  const [solSortDirection, setSolSortDirection] = useState('ASC');

  const onSort = (setSortBy, setSortDirection) => ({
    sortBy,
    sortDirection,
  }) => {
    setSortBy(sortBy);
    setSortDirection(sortDirection);
  };

  const solutionDetailColumn = [
    {
      label: intl.translate('name'),
      dataKey: 'name',
    },
    {
      label: intl.translate('version_env'),
      dataKey: 'version',
    },
    {
      label: intl.translate('action'),
      dataKey: 'action',
      disableSort: true,
      flexGrow: 1,
      renderer: (_, rowData) => {
        const solName = rowData.name;
        const solution =
          deployedSolutions.find((depSol) => depSol.name === solName) ?? {};
        const availableDeployingSolution = availableSolutions?.find(
          (avaSol) => avaSol.name === solName,
        );

        const availableUpgradeVersion = [];
        const availableDowngradeVersion = [];

        availableDeployingSolution.versions.forEach((avaDepSol) => {
          if (avaDepSol.version.localeCompare(solution.version) <= -1) {
            availableDowngradeVersion.push(avaDepSol);
          } else if (avaDepSol.version.localeCompare(solution.version) >= 1) {
            availableUpgradeVersion.push(avaDepSol);
          }
        });
        solution.availableDowngradeVersion = availableDowngradeVersion;
        solution.availableUpgradeVersion = availableUpgradeVersion;

        return (
          <>
            {solution?.availableUpgradeVersion?.length > 0 && (
              <Button
                size="smaller"
                text={intl.translate('upgrade')}
                outlined
                onClick={(e) => {
                  setUpgradeOrDowngrade('Upgrade');
                  setSelectedSolName(solName);
                  setIsUpgradeDowngradeSolutionModalOpen(true);
                }}
                data-cy="upgrade"
              />
            )}{' '}
            {solution?.availableDowngradeVersion?.length > 0 && (
              <Button
                size="smaller"
                text={intl.translate('downgrade')}
                outlined
                onClick={() => {
                  setUpgradeOrDowngrade('Downgrade');
                  setSelectedSolName(solName);
                  setIsUpgradeDowngradeSolutionModalOpen(true);
                }}
                data-cy="downgrade"
              />
            )}
            {solution?.availableUpgradeVersion?.length === 0 &&
              solution?.availableDowngradeVersion?.length === 0 && (
                <span>{intl.translate('no_other_available_version')}</span>
              )}
          </>
        );
      },
    },
  ];

  const sortedSolutions =
    sortSelector(deployedSolutions, solSortBy, solSortDirection) ?? [];

  const selectedSolution =
    deployedSolutions?.find((depSol) => depSol.name === selectedSolName) ?? [];

  const initialValues = {
    version: {
      label: selectedSolution?.version,
      value: selectedSolution?.version,
    },
  };

  const validationSchema = {
    version: yup
      .object()
      .shape({
        label: yup.string().required(),
        value: yup.string().required(),
      })
      .required(),
  };

  return environment ? (
    <>
      <PageContainer>
        <Table
          list={sortedSolutions}
          columns={solutionDetailColumn}
          disableHeader={false}
          headerHeight={40}
          rowHeight={40}
          sortBy={solSortBy}
          sortDirection={solSortDirection}
          onSort={onSort(setSolSortBy, setSolSortDirection)}
          onRowClick={() => {}}
          noRowsRenderer={() => (
            <NoRowsRenderer content={intl.translate('no_data_available')} />
          )}
        />
      </PageContainer>

      <Modal
        close={() => {
          setIsUpgradeDowngradeSolutionModalOpen(false);
          setSelectedSolName('');
        }}
        isOpen={isUpgradeDowngradeSolutionModalOpen}
        title={
          upgradeOrDowngrade === 'Upgrade'
            ? intl.translate('upgrade_solution', { solName: selectedSolName })
            : intl.translate('downgrade_solution', { solName: selectedSolName })
        }
      >
        <Formik
          enableReinitialize
          initialValues={initialValues}
          validationSchema={validationSchema}
          onSubmit={(values) => {
            const upgradeSolutionVersion = values.version.value;
            dispatch(
              prepareEnvironmentAction(
                environment.name,
                selectedSolName,
                upgradeSolutionVersion,
              ),
            );
            setIsUpgradeDowngradeSolutionModalOpen(false);
          }}
        >
          {(formikProps) => {
            const { setFieldValue, values } = formikProps;

            const handleSelectChange = (field) => (selectedObj) => {
              setFieldValue(field, selectedObj ? selectedObj : '');
            };

            let selectedSolutionVersionsOptions = [];
            if (upgradeOrDowngrade === 'Upgrade') {
              selectedSolutionVersionsOptions = selectedSolution.availableUpgradeVersion.map(
                (avaUpgradeVersion) => ({
                  label: avaUpgradeVersion.version,
                  value: avaUpgradeVersion.version,
                  'data-cy': avaUpgradeVersion.version,
                }),
              );
            } else {
              selectedSolutionVersionsOptions = selectedSolution.availableDowngradeVersion.map(
                (avaDowngradeVersion) => ({
                  label: avaDowngradeVersion.version,
                  value: avaDowngradeVersion.version,
                  'data-cy': avaDowngradeVersion.version,
                }),
              );
            }
            initialValues.version.label =
              selectedSolutionVersionsOptions[0]?.value;
            initialValues.version.value =
              selectedSolutionVersionsOptions[0]?.value;

            return (
              <>
                <Form>
                  <FormStyle>
                    <SelectContainer>
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
                          setIsUpgradeDowngradeSolutionModalOpen(false);
                          setSelectedSolName('');
                        }}
                      />
                      <Button
                        text={
                          upgradeOrDowngrade === 'Upgrade'
                            ? intl.translate('upgrade')
                            : intl.translate('downgrade')
                        }
                        type="submit"
                        data-cy="upgrade_downgrade_button"
                      />
                    </ActionContainer>
                  </FormStyle>
                </Form>
              </>
            );
          }}
        </Formik>
      </Modal>
    </>
  ) : (
    <Loader size="large"></Loader>
  );
};

export default SolutionDetail;
