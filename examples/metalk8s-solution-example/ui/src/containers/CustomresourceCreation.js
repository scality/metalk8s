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
      .sc-input-label,
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
  margin: ${padding.large} 0;
  justify-content: flex-end;

  button {
    margin-right: ${padding.large};
  }
`;

const FormSectionTitle = styled.h3`
  margin: 0 ${padding.small} 0;
  color: ${gray};
`;

const FormSection = styled.div`
  padding: 0 ${padding.larger};
  display: flex;
  flex-direction: column;
`;

const CustomresourceCreationForm = props => {
  const { intl, namespaces } = props;
  const initialValues = {
    namespaces: namespaces.length ? namespaces[0].metadata.name : '',
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
                label: namespace.metadata.name,
                value: namespace.metadata.name
              };
            });

            return (
              <Form>
                <FormSection>
                  <FormSectionTitle>
                    {intl.messages.create_new_customResource}
                  </FormSectionTitle>
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
                    name="version"
                    label={intl.messages.version}
                    value={values.version}
                    onChange={handleChange('version')}
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
    namespaces: state.app.namespaces.list
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
