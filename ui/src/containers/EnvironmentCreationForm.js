import React from 'react';
import { useDispatch } from 'react-redux';
import { useHistory } from 'react-router';
import { Formik, Form } from 'formik';
import * as yup from 'yup';
import styled from 'styled-components';
import isEmpty from 'lodash.isempty';
import { Input, Button } from '@scality/core-ui';
import { padding } from '@scality/core-ui/dist/style/theme';

import { intl } from '../translations/IntlGlobalProvider';
import { createEnvironmentAction } from '../ducks/app/solutions';

const EnvironmentCreationFormContainer = styled.div`
  display: inline-block;
  padding-left: ${padding.base};
`;

const CreationFormContainer = styled.div`
  margin-top: ${padding.base};
`;

const ActionContainer = styled.div`
  display: flex;
  margin: ${padding.large} 0;
  justify-content: flex-end;
  button {
    margin-right: ${padding.large};
  }
`;

const FormSection = styled.div`
  display: flex;
  padding: 0 ${padding.larger};
  flex-direction: column;

  .sc-input {
    display: inline-flex;
    margin: ${padding.smaller} 0;
    .sc-input-label {
      width: 200px;
    }
    .sc-input-wrapper {
      width: 200px;
    }
  }
`;

const EnvironmentCreationForm = (props) => {
  const dispatch = useDispatch();
  const history = useHistory();

  const initialValues = {
    name: '',
    description: '',
  };
  const environmentNameRegex = /^[a-z0-9]([-a-z0-9]*[a-z0-9])?(\.[a-z0-9]([-a-z0-9]*[a-z0-9])?)*$/;
  const validationSchema = yup.object().shape({
    name: yup
      .string()
      .matches(environmentNameRegex, intl.translate('name_error'))
      .required(
        intl.translate('generic_missing_field', {
          field: intl.translate('name').toLowerCase(),
        }),
      ),

    description: yup.string(),
  });

  return (
    <EnvironmentCreationFormContainer>
      <CreationFormContainer>
        <Formik
          initialValues={initialValues}
          validationSchema={validationSchema}
          onSubmit={(values) => {
            dispatch(createEnvironmentAction(values));
          }}
        >
          {(formikProps) => {
            const { setFieldValue, errors, dirty } = formikProps;

            //handleChange of the Formik props does not update 'values' when field value is empty
            const handleChange = (field) => (e) => {
              const { value, checked, type } = e.target;
              setFieldValue(field, type === 'checkbox' ? checked : value, true);
            };

            return (
              <Form>
                <FormSection>
                  <Input
                    name="name"
                    label={intl.translate('name')}
                    onChange={handleChange('name')}
                    error={errors.name}
                  />
                  <Input
                    name="description"
                    label={intl.translate('description')}
                    rows="4"
                    onChange={handleChange('description')}
                    type="textarea"
                  />
                </FormSection>
                <ActionContainer>
                  <Button
                    text={intl.translate('cancel')}
                    type="button"
                    outlined
                    onClick={() => {
                      history.push('/environments');
                    }}
                  />
                  <Button
                    text={intl.translate('create')}
                    type="submit"
                    disabled={!dirty || !isEmpty(errors)}
                    data-cy="submit-create-environment"
                  />
                </ActionContainer>
              </Form>
            );
          }}
        </Formik>
      </CreationFormContainer>
    </EnvironmentCreationFormContainer>
  );
};

export default EnvironmentCreationForm;
