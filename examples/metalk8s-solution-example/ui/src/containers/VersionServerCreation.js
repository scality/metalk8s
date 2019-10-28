import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import styled from 'styled-components';
import { Formik, Form } from 'formik';
import * as yup from 'yup';
import { useRouteMatch, useHistory } from 'react-router';
import { injectIntl } from 'react-intl';
import { Button, Input, Breadcrumb } from '@scality/core-ui';
import { padding } from '@scality/core-ui/dist/style/theme';
import { isEmpty } from 'lodash';
import semver from 'semver';

import { isVersionSupported } from '../services/utils';
import { createVersionServerAction } from '../ducks/app/versionServer';
import {
  BreadcrumbContainer,
  BreadcrumbLabel,
  StyledLink
} from '../components/BreadcrumbStyle';

const CreateVersionServerContainter = styled.div`
  height: 100%;
  padding: ${padding.base};
  display: inline-block;
`;

const CreateVersionServerLayout = styled.div`
  height: 100%;
  overflow: auto;
  display: inline-block;
  margin-top: ${padding.base};
  form {
    .sc-input {
      margin: ${padding.smaller} 0;
      .sc-input-label {
        width: 150px;
        box-sizing: border-box;
      }
      .sc-select,
      .sc-input-type {
        width: 200px;
        box-sizing: border-box;
      }
    }
  }
`;

const ActionContainer = styled.div`
  display: flex;
  margin: ${padding.large} 0;
  justify-content: flex-end;

  button {
    margin-left: ${padding.large};
  }
`;

const FormSection = styled.div`
  padding: 0 ${padding.larger};
  display: flex;
  flex-direction: column;
`;

const VersionServerCreationForm = ({ intl }) => {
  const config = useSelector(state => state.config);
  const environments = useSelector(state => state.app.environment.list);
  const dispatch = useDispatch();
  const createVersionServer = body => dispatch(createVersionServerAction(body));
  const history = useHistory();
  const match = useRouteMatch();
  const environment = match.params.name;
  const currentEnvironment = environments.find(
    item => item.name === environment
  );
  const currentEnvironmentVersion = currentEnvironment
    ? currentEnvironment.version
    : '';
  const initialValues = {
    version: '',
    replicas: 1,
    name: '',
    environment
  };

  const validationSchema = yup.object().shape({
    version: yup
      .string()
      .required()
      .test('is-version-valid', intl.messages.not_valid_version, value =>
        semver.valid(value)
      ),
    replicas: yup.number().required(),
    name: yup.string().required()
  });

  return (
    <CreateVersionServerContainter>
      <BreadcrumbContainer>
        <Breadcrumb
          activeColor={config.theme.brand.secondary}
          paths={[
            <StyledLink to="/environments">
              {intl.messages.environments}
            </StyledLink>,
            <StyledLink to={`/environments/${environment}`}>
              {environment}
            </StyledLink>,
            <BreadcrumbLabel title={intl.messages.create_version_server}>
              {intl.messages.create_version_server}
            </BreadcrumbLabel>
          ]}
        />
      </BreadcrumbContainer>
      <CreateVersionServerLayout>
        <Formik
          initialValues={initialValues}
          validationSchema={validationSchema}
          onSubmit={createVersionServer}
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

            //handleChange of the Formik props does not update 'values' when field value is empty
            const handleChange = field => e => {
              const { value, checked, type } = e.target;
              setFieldValue(field, type === 'checkbox' ? checked : value, true);
            };
            const handleSelectChange = field => selectedObj => {
              setFieldValue(field, selectedObj.value);
            };
            //get the select item from the object array
            const getSelectedObjectItem = (items, selectedValue) => {
              return items.find(item => item.value === selectedValue);
            };
            //touched is not "always" correctly set
            const handleOnBlur = e => setFieldTouched(e.target.name, true);
            const availableVersions = config.versions
              .filter(isVersionSupported(currentEnvironmentVersion))
              .map(item => {
                return {
                  label: item.version,
                  value: item.version
                };
              });
            return (
              <Form>
                <FormSection>
                  <Input
                    name="name"
                    label={intl.messages.name}
                    value={values.name}
                    onChange={handleChange('name')}
                    error={touched.name && errors.name}
                    onBlur={handleOnBlur}
                  />

                  <Input
                    label={intl.messages.version}
                    clearable={false}
                    type="select"
                    options={availableVersions}
                    placeholder={intl.messages.select_a_version}
                    noResultsText={intl.messages.not_found}
                    name="version"
                    onChange={handleSelectChange('version')}
                    value={getSelectedObjectItem(
                      availableVersions,
                      values.version
                    )}
                    error={touched.version && errors.version}
                    onBlur={handleOnBlur}
                  />

                  <Input
                    name="replicas"
                    label={intl.messages.replicas}
                    value={values.replicas}
                    onChange={handleChange('replicas')}
                    error={touched.replicas && errors.replicas}
                    onBlur={handleOnBlur}
                  />

                  <ActionContainer>
                    <div>
                      <div>
                        <Button
                          text={intl.messages.cancel}
                          type="button"
                          outlined
                          onClick={() =>
                            history.push(`/environments/${environment}`)
                          }
                        />
                        <Button
                          text={intl.messages.create}
                          type="submit"
                          disabled={!dirty || !isEmpty(errors)}
                        />
                      </div>
                    </div>
                  </ActionContainer>
                </FormSection>
              </Form>
            );
          }}
        </Formik>
      </CreateVersionServerLayout>
    </CreateVersionServerContainter>
  );
};

export default injectIntl(VersionServerCreationForm);
