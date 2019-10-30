import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { injectIntl } from 'react-intl';
import styled from 'styled-components';
import { useRouteMatch } from 'react-router';
import { Breadcrumb, Button, Input } from '@scality/core-ui';
import { padding } from '@scality/core-ui/dist/style/theme';
import { Formik, Form } from 'formik';
import semver from 'semver';
import * as yup from 'yup';
import { isEmpty } from 'lodash';

import {
  BreadcrumbContainer,
  BreadcrumbLabel,
  StyledLink
} from '../components/BreadcrumbStyle';
import {
  InformationListContainer,
  InformationSpan,
  InformationLabel,
  InformationValue,
  InformationMainValue
} from '../components/InformationList';
import ComponentsList from './ComponentLists';
import { upgradeEnvironmentAction } from '../ducks/app/environment';

const EnvironmentDetailContainer = styled.div`
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  height: 100%;
  padding: ${padding.base};
`;

const ComponentContainer = styled.div`
  padding: 0 ${padding.larger};
`;

const EditIcon = styled.span`
padding: 0 ${padding.base}
  color: ${props => props.theme.brand.primary};
  &:hover {
    color: ${props => props.theme.brand.secondary};
    cursor: pointer;
  }
`;

const EnvironmentEditFormContainer = styled.div`
  display: inline-block;
  .sc-button,
  .sc-input {
    margin-right: ${padding.smaller};
  }
`;

const EnvironmentEditForm = props => {
  const {
    intl,
    currentVersion,
    onCancel,
    onSubmit,
    environment,
    versions
  } = props;
  const initialValues = {
    version: currentVersion
  };
  const validationSchema = yup.object().shape({
    version: yup
      .string()
      .required()
      .test('is-version-valid', intl.messages.not_valid_version, value =>
        semver.valid(value)
      )
  });

  return (
    <EnvironmentEditFormContainer>
      <Formik
        initialValues={initialValues}
        validationSchema={validationSchema}
        onSubmit={values =>
          onSubmit({ name: environment, version: values.version })
        }
      >
        {formProps => {
          const {
            values,
            touched,
            errors,
            dirty,
            setFieldTouched,
            setFieldValue
          } = formProps;

          //touched is not "always" correctly set
          const handleOnBlur = e => setFieldTouched(e.target.name, true);
          const handleSelectChange = field => selectedObj => {
            setFieldValue(field, selectedObj.value);
          };
          //get the select item from the object array
          const getSelectedObjectItem = (items, selectedValue) => {
            return items.find(item => item.value === selectedValue);
          };
          const availableVersions = versions.map(item => {
            return {
              label: item.version,
              value: item.version
            };
          });
          return (
            <Form>
              <Input
                clearable={false}
                type="select"
                options={availableVersions}
                placeholder={intl.messages.select_a_version}
                noResultsText={intl.messages.not_found}
                name="version"
                onChange={handleSelectChange('version')}
                value={getSelectedObjectItem(availableVersions, values.version)}
                error={touched.version && errors.version}
                onBlur={handleOnBlur}
              />
              <Button
                title={intl.messages.cancel}
                icon={<i className="fas fa-times"></i>}
                type="button"
                outlined
                onClick={onCancel}
              />
              <Button
                title={intl.messages.edit}
                icon={<i className="fas fa-check"></i>}
                type="submit"
                disabled={!dirty || !isEmpty(errors)}
              />
            </Form>
          );
        }}
      </Formik>
    </EnvironmentEditFormContainer>
  );
};
const EnvironmentDetail = ({ intl }) => {
  const config = useSelector(state => state.config);
  const environments = useSelector(state => state.app.environment.list);
  const dispatch = useDispatch();
  const upgradeEnvironment = body => dispatch(upgradeEnvironmentAction(body));
  const match = useRouteMatch();
  const [environmentEditing, setEnvironmentEditing] = useState(false);
  const environmentName = match.params.name;
  const environment = environments.find(
    environment => environment.name === environmentName
  );
  return environment ? (
    <EnvironmentDetailContainer>
      <BreadcrumbContainer>
        <Breadcrumb
          activeColor={config.theme.brand.secondary}
          paths={[
            <StyledLink to="/environments">
              {intl.messages.environments}{' '}
            </StyledLink>,
            <BreadcrumbLabel title={environment.name}>
              {environment.name}
            </BreadcrumbLabel>
          ]}
        />
      </BreadcrumbContainer>
      <InformationListContainer>
        <h3>{intl.messages.information}</h3>
        <InformationSpan>
          <InformationLabel>{intl.messages.name}</InformationLabel>
          <InformationMainValue>{environment.name}</InformationMainValue>
        </InformationSpan>
        <InformationSpan>
          <InformationLabel>{intl.messages.status}</InformationLabel>
          <InformationValue>
            {intl.messages[environment.status] || environment.status}
          </InformationValue>
        </InformationSpan>
        <InformationSpan>
          <InformationLabel>{intl.messages.version}</InformationLabel>
          <InformationValue>
            {environmentEditing ? (
              <EnvironmentEditForm
                intl={intl}
                onCancel={() => setEnvironmentEditing(false)}
                onSubmit={payload => {
                  upgradeEnvironment(payload);
                  setEnvironmentEditing(false);
                }}
                currentVersion={environment.version}
                environment={environmentName}
                versions={config.versions}
              />
            ) : (
              <InformationValue>
                {environment.version}
                <EditIcon
                  title={intl.messages.edit_environment_version}
                  onClick={() => setEnvironmentEditing(true)}
                >
                  <i className="fas fa-edit"></i>
                </EditIcon>
              </InformationValue>
            )}
          </InformationValue>
        </InformationSpan>
        <InformationSpan>
          <InformationLabel>{intl.messages.description}</InformationLabel>
          <InformationValue>{environment.description}</InformationValue>
        </InformationSpan>
      </InformationListContainer>
      <ComponentContainer>
        <h3>{intl.messages.components}</h3>
        <ComponentsList />
      </ComponentContainer>
    </EnvironmentDetailContainer>
  ) : null;
};

export default injectIntl(EnvironmentDetail);
