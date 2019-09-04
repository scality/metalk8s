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
import { createNamespacesAction } from '../ducks/app/namespaces';

const CreateNamespacesContainter = styled.div`
  height: 100%;
  padding: ${padding.base};
  display: inline-block;
`;

const CreateNamespacesLayout = styled.div`
  height: 100%;
  overflow: auto;
  display: inline-block;
  margin-top: ${padding.base};
  form {
    .sc-input {
      margin: ${padding.smaller} 0;
      .sc-input-label {
        width: 200px;
      }
    }
  }
`;

const FormSection = styled.div`
  padding: 0 ${padding.larger};
  display: flex;
  flex-direction: column;
`;

const ActionContainer = styled.div`
  display: flex;
  margin: ${padding.large} 0;
  justify-content: flex-end;

  button {
    margin-left: ${padding.large};
  }
`;

const FormSectionTitle = styled.h3`
  margin: 0 ${padding.small} 0;
  color: ${gray};
`;

const initialValues = {
  name: ''
};

const validationSchema = Yup.object().shape({
  name: Yup.string().required()
});

class NamespacesCreateForm extends React.Component {
  render() {
    const { intl } = this.props;
    return (
      <CreateNamespacesContainter>
        <CreateNamespacesLayout>
          <Formik
            initialValues={initialValues}
            validationSchema={validationSchema}
            onSubmit={this.props.createNamespaces}
          >
            {props => {
              const {
                values,
                touched,
                errors,
                dirty,
                setFieldTouched,
                setFieldValue
              } = props;

              //handleChange of the Formik props does not update 'values' when field value is empty
              const handleChange = field => e => {
                const { value, checked, type } = e.target;
                setFieldValue(
                  field,
                  type === 'checkbox' ? checked : value,
                  true
                );
              };
              //touched is not "always" correctly set
              const handleOnBlur = e => setFieldTouched(e.target.name, true);

              return (
                <Form>
                  <FormSection>
                    <FormSectionTitle>
                      {intl.messages.create_new_namespace}
                    </FormSectionTitle>
                    <Input
                      name="name"
                      label={intl.messages.name}
                      value={values.name}
                      onChange={handleChange('name')}
                      error={touched.name && errors.name}
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
                              this.props.history.push('/solutions')
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
        </CreateNamespacesLayout>
      </CreateNamespacesContainter>
    );
  }
}

const mapDispatchToProps = dispatch => {
  return {
    createNamespaces: body => dispatch(createNamespacesAction(body))
  };
};

export default injectIntl(
  withRouter(
    connect(
      null,
      mapDispatchToProps
    )(NamespacesCreateForm)
  )
);
