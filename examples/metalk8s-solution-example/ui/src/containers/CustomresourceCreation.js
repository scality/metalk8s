import React from 'react';
import { connect } from 'react-redux';
import styled from 'styled-components';
import { Formik, Form } from 'formik';
import * as Yup from 'yup';
import { withRouter } from 'react-router-dom';
import { injectIntl } from 'react-intl';
import { Button, Input } from '@scality/core-ui';
import { padding, gray } from '@scality/core-ui/dist/style/theme';
import { isEmpty } from 'lodash';
import semver from 'semver';

import { createCustomresourceAction } from '../ducks/app/customResource';

const CreateCustomresourceContainter = styled.div`
  height: 100%;
  padding: ${padding.base};
  display: inline-block;
`;

const CreateCustomresourceLayout = styled.div`
  height: 100%;
  overflow: auto;
  display: inline-block;
  margin-top: ${padding.base};
  form {
    .sc-input {
      margin: ${padding.smaller} 0;
      .sc-input-label {
        width: 120px;
        box-sizing: border-box;
      }

      .sc-input-type,
      .sc-select {
        width: 200px;
        box-sizing: border-box;
      }
    }
  }
`;

const ActionContainer = styled.div`
  display: flex;
  justify-content: flex-end;
  margin: 0 ${padding.larger};

  button {
    margin-left: ${padding.large};
  }
`;

const FormSectionTitle = styled.h3`
  margin: 0 ${padding.small} 0;
`;

const FormSubSectionTitle = styled.h4`
  margin: 0 ${padding.small} ${padding.small};
  color: ${gray};
`;

const FormSection = styled.div`
  padding: ${padding.larger};
  display: flex;
  flex-direction: column;
`;

const FormSubSection = styled.div`
  padding: 0 ${padding.larger} ${padding.larger};
  display: flex;
  flex-direction: column;
`;

const CustomresourceCreationForm = props => {
  const { intl, namespaces, versions } = props;
  const initialValues = {
    namespaces: namespaces.length ? namespaces[0].name : '',
    version: '',
    replicas: '',
    name: ''
  };

  const validationSchema = Yup.object().shape({
    namespaces: Yup.string().required(),
    version: Yup.string()
      .required()
      .test('is-version-valid', intl.messages.not_valid_version, value =>
        semver.valid(value)
      ),
    replicas: Yup.number().required(),
    name: Yup.string().required()
  });

  return (
    <CreateCustomresourceContainter>
      <CreateCustomresourceLayout>
        <Formik
          initialValues={initialValues}
          validationSchema={validationSchema}
          onSubmit={props.createCustomresource}
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

            //touched is not "always" correctly set
            const handleOnBlur = e => setFieldTouched(e.target.name, true);
            const handleSelectChange = field => selectedObj => {
              setFieldValue(field, selectedObj.value);
            };

            const options = namespaces.map(namespace => {
              return {
                label: namespace.displayName,
                value: namespace.name
              };
            });

            const versionOptions = versions.map(option => {
              return {
                label: option.version,
                value: option.version
              };
            });

            return (
              <Form>
                <FormSectionTitle>
                  {intl.messages.create_new_customResource}
                </FormSectionTitle>
                <FormSection>
                  <FormSubSection>
                    <FormSubSectionTitle>
                      {intl.messages.main_parameters}
                    </FormSubSectionTitle>
                    <Input
                      name="name"
                      label={intl.messages.name}
                      value={values.name}
                      onChange={handleChange('name')}
                      error={touched.name && errors.name}
                      onBlur={handleOnBlur}
                    />
                    <Input
                      id="namespaces_input_creation"
                      label={intl.messages.namespace}
                      clearable={false}
                      type="select"
                      options={options}
                      placeholder={intl.messages.select_a_namespace}
                      noResultsText={intl.messages.not_found}
                      name="namespaces"
                      onChange={handleSelectChange('namespaces')}
                      value={values.namespaces}
                      error={touched.namespaces && errors.namespaces}
                      onBlur={handleOnBlur}
                    />
                    <Input
                      id="version_input_creation"
                      name="version"
                      type="select"
                      clearable={false}
                      options={versionOptions}
                      placeholder={intl.messages.select_a_version}
                      noResultsText={intl.messages.not_found}
                      label={intl.messages.version}
                      value={values.version}
                      onChange={handleSelectChange('version')}
                      error={touched.version && errors.version}
                      onBlur={handleOnBlur}
                    />
                  </FormSubSection>
                  <FormSubSection>
                    <FormSubSectionTitle>
                      {intl.messages.custom_parameters}
                    </FormSubSectionTitle>
                    <Input
                      name="replicas"
                      label={intl.messages.replicas}
                      value={values.replicas}
                      onChange={handleChange('replicas')}
                      error={touched.replicas && errors.replicas}
                      onBlur={handleOnBlur}
                    />
                  </FormSubSection>
                  <ActionContainer>
                    <div>
                      <div>
                        <Button
                          text={intl.messages.cancel}
                          type="button"
                          outlined
                          onClick={() => props.history.push('/customResource')}
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
      </CreateCustomresourceLayout>
    </CreateCustomresourceContainter>
  );
};

function mapStateToProps(state) {
  return {
    namespaces: state.app.namespaces.list,
    versions: state.config.versions
  };
}

const mapDispatchToProps = dispatch => {
  return {
    createCustomresource: body => dispatch(createCustomresourceAction(body))
  };
};

export default injectIntl(
  withRouter(
    connect(
      mapStateToProps,
      mapDispatchToProps
    )(CustomresourceCreationForm)
  )
);
