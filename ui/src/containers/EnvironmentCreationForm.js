import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useHistory } from 'react-router';
import { injectIntl } from 'react-intl';
import { Formik, Form } from 'formik';
import * as yup from 'yup';
import styled from 'styled-components';
import isEmpty from 'lodash.isempty';
import { Breadcrumb, Input, Button } from '@scality/core-ui';
import { padding, fontSize, gray } from '@scality/core-ui/dist/style/theme';

import {
  BreadcrumbContainer,
  BreadcrumbLabel,
  StyledLink,
} from '../components/BreadcrumbStyle';
import { createEnvironmentAction } from '../ducks/app/solutions';

const EnvironmentCreationFormContainer = styled.div`
  display: inline-block;
  padding: ${padding.base};

  /* FIXME we might want to change that in core-ui later */
  .sc-breadcrumb_item {
    max-width: 300px;
  }
`;

const CreationFormContainer = styled.div`
  margin-top: ${padding.base};
`;

const TextAreaContainer = styled.div`
  display: inline-flex;
`;

const TextAreaLabel = styled.label`
  width: 200px;
  align-self: flex-start;
  padding: ${padding.small};
  font-size: ${fontSize.base};
`;

/**
 * width = 200px - ${padding.small} - ${border} * 2
 */
const TextArea = styled.textarea`
  width: 178px;
  border-radius: 4px;
  border: 1px solid ${gray};
  padding: 8px ${padding.small};
  font-size: ${fontSize.base};
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

const EnvironmentCreationForm = props => {
  const { intl } = props;
  const dispatch = useDispatch();
  const history = useHistory();
  const theme = useSelector(state => state.config.theme);

  const initialValues = {
    name: '',
    description: '',
  };

  const validationSchema = yup.object().shape({
    name: yup
      .string()
      .required(
        intl.formatMessage(
          { id: 'generic_missing_field' },
          { field: intl.messages.name.toLowerCase() },
        ),
      ),
    description: yup.string(),
  });

  return (
    <EnvironmentCreationFormContainer>
      <BreadcrumbContainer>
        <Breadcrumb
          activeColor={theme.brand.secondary}
          paths={[
            <StyledLink to="/solutions">{intl.messages.solutions}</StyledLink>,
            <BreadcrumbLabel>
              {intl.messages.create_new_environment}
            </BreadcrumbLabel>,
          ]}
        />
      </BreadcrumbContainer>
      <CreationFormContainer>
        <Formik
          initialValues={initialValues}
          validationSchema={validationSchema}
          onSubmit={values => {
            dispatch(createEnvironmentAction(values));
          }}
        >
          {formikProps => {
            const { setFieldValue, errors, dirty } = formikProps;

            //handleChange of the Formik props does not update 'values' when field value is empty
            const handleChange = field => e => {
              const { value, checked, type } = e.target;
              setFieldValue(field, type === 'checkbox' ? checked : value, true);
            };

            return (
              <Form>
                <FormSection>
                  <Input
                    name="name"
                    label={intl.messages.name}
                    onChange={handleChange('name')}
                    error={errors.name}
                  />
                  <TextAreaContainer>
                    <TextAreaLabel>{intl.messages.description}</TextAreaLabel>
                    <TextArea
                      name="description"
                      rows="4"
                      onChange={handleChange('description')}
                    />
                  </TextAreaContainer>
                </FormSection>

                <ActionContainer>
                  <Button
                    text={intl.messages.cancel}
                    type="button"
                    outlined
                    onClick={() => {
                      history.push('/solutions');
                    }}
                  />
                  <Button
                    text={intl.messages.create}
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

export default injectIntl(EnvironmentCreationForm);
