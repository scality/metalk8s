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
import { createClockServerAction } from '../ducks/app/clockServer';
import {
  BreadcrumbContainer,
  BreadcrumbLabel,
  StyledLink
} from '../components/BreadcrumbStyle';

const CreateClockServerContainer = styled.div`
  height: 100%;
  padding: ${padding.base};
  display: inline-block;
`;

const CreateClockServerLayout = styled.div`
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

const ClockServerCreationForm = ({ intl }) => {
  const config = useSelector(state => state.config);
  const environments = useSelector(state => state.app.environment.list);
  const dispatch = useDispatch();
  const createClockServer = body => dispatch(createClockServerAction(body));

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
    timezone: '',
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
    timezone: yup.string().required(),
    name: yup.string().required()
  });

  return (
    <CreateClockServerContainer>
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
            <BreadcrumbLabel title={intl.messages.create_clock_server}>
              {intl.messages.create_clock_server}
            </BreadcrumbLabel>
          ]}
        />
      </BreadcrumbContainer>
      <CreateClockServerLayout>
        <Formik
          initialValues={initialValues}
          validationSchema={validationSchema}
          onSubmit={createClockServer}
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
                    name="timezone"
                    label={intl.messages.timezone}
                    value={values.timezone}
                    onChange={handleChange('timezone')}
                    error={touched.timezone && errors.timezone}
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
                            history.push(`/environments/${match.params.name}`)
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
      </CreateClockServerLayout>
    </CreateClockServerContainer>
  );
};

export default injectIntl(ClockServerCreationForm);
