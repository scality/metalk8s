import React from 'react';
import { connect } from 'react-redux';
import styled from 'styled-components';
import { Formik, Form } from 'formik';
import * as Yup from 'yup';
import { withRouter, Link } from 'react-router-dom';
import { injectIntl } from 'react-intl';
import { Button, Input, Checkbox, Breadcrumb } from '@scality/core-ui';
import { padding, fontSize, gray } from '@scality/core-ui/dist/style/theme';
import { isEmpty } from 'lodash';
import {
  createNodeAction,
  clearCreateNodeErrorAction
} from '../ducks/app/nodes';

const CreateNodeContainter = styled.div`
  height: 100%;
  overflow: auto;
  padding: ${padding.base};
  display: inline-block;
`;

const CreateNodeLayout = styled.div`
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

const ActionContainer = styled.div`
  display: flex;
  margin: ${padding.large} 0;
  justify-content: flex-end;

  button {
    margin-right: ${padding.large};
  }
`;

const ErrorMessage = styled.span`
  visibility: ${props => (props.visible ? 'visible' : 'hidden')};
  color: ${props => props.theme.brand.danger};
  font-size: ${fontSize.small};
`;

const CheckboxGroup = styled.div`
  display: flex;
  flex-direction: column;
  .sc-checkbox {
    margin: ${padding.small} 0;
    .text {
      font-size: ${fontSize.base};
    }
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

const InputContainer = styled.div`
  display: inline-flex;
`;

const InputLabel = styled.label`
  padding: ${padding.small};
  font-size: ${fontSize.base};
`;

const InputValue = styled(InputLabel)`
  padding: ${padding.small} 0;
`;

const BreadcrumbContainer = styled.div`
  margin-left: ${padding.small};
  .sc-breadcrumb {
    padding: ${padding.smaller};
  }
`;

const BreadcrumbLabel = styled.span`
  font-size: ${fontSize.large};
`;

const StyledLink = styled(Link)`
  font-size: ${fontSize.large};
`;

const initialValues = {
  name: '',
  ssh_user: '',
  hostName_ip: '',
  ssh_port: '22',
  ssh_key_path: '/etc/metalk8s/pki/salt-bootstrap',
  sudo_required: false,
  workload_plane: true,
  control_plane: false,
  infra: false
};

const validationSchema = Yup.object().shape({
  name: Yup.string().required(),
  ssh_user: Yup.string().required(),
  hostName_ip: Yup.string().required(),
  ssh_port: Yup.number()
    .min(0)
    .max(65535)
    .required(),
  ssh_key_path: Yup.string().required(),
  sudo_required: Yup.boolean().required(),
  workload_plane: Yup.boolean().required(),
  control_plane: Yup.boolean().required(),
  infra: Yup.boolean().required()
});

class NodeCreateForm extends React.Component {
  componentWillUnmount() {
    this.props.clearCreateNodeError();
  }

  render() {
    const { intl, asyncErrors, theme } = this.props;
    return (
      <CreateNodeContainter>
        <BreadcrumbContainer>
          <Breadcrumb
            activeColor={theme.brand.secondary}
            paths={[
              <StyledLink to="/nodes">{intl.messages.nodes}</StyledLink>,
              <BreadcrumbLabel>Create New Node</BreadcrumbLabel>
            ]}
          />
        </BreadcrumbContainer>
        <CreateNodeLayout>
          <Formik
            initialValues={initialValues}
            validationSchema={validationSchema}
            onSubmit={this.props.createNode}
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
                      {intl.messages.new_node_data}
                    </FormSectionTitle>
                    <Input
                      name="name"
                      label={intl.messages.name}
                      value={values.name}
                      onChange={handleChange('name')}
                      error={touched.name && errors.name}
                      onBlur={handleOnBlur}
                    />
                    <InputContainer className="sc-input">
                      <InputLabel className="sc-input-label">
                        {intl.messages.version}
                      </InputLabel>
                      <InputValue>{this.props.clusterVersion}</InputValue>
                    </InputContainer>
                    <InputContainer className="sc-input">
                      <InputLabel className="sc-input-label">
                        {intl.messages.roles}
                      </InputLabel>
                      <CheckboxGroup>
                        <Checkbox
                          name="workload_plane"
                          label={intl.messages.workload_plane}
                          checked={values.workload_plane}
                          value={values.workload_plane}
                          onChange={handleChange('workload_plane')}
                          onBlur={handleOnBlur}
                        />
                        <Checkbox
                          name="control_plane"
                          label={intl.messages.control_plane}
                          checked={values.control_plane}
                          value={values.control_plane}
                          onChange={handleChange('control_plane')}
                          onBlur={handleOnBlur}
                        />
                        <Checkbox
                          name="infra"
                          label={intl.messages.infra}
                          checked={values.infra}
                          value={values.infra}
                          onChange={handleChange('infra')}
                          onBlur={handleOnBlur}
                        />
                        <ErrorMessage
                          visible={
                            !(
                              values.workload_plane ||
                              values.control_plane ||
                              values.infra
                            )
                          }
                        >
                          {intl.messages.role_values_error}
                        </ErrorMessage>
                      </CheckboxGroup>
                    </InputContainer>
                  </FormSection>

                  <FormSection>
                    <FormSectionTitle>
                      {intl.messages.new_node_access}
                    </FormSectionTitle>
                    <Input
                      name="ssh_user"
                      label={intl.messages.ssh_user}
                      value={values.ssh_user}
                      onChange={handleChange('ssh_user')}
                      error={touched.ssh_user && errors.ssh_user}
                      onBlur={handleOnBlur}
                    />
                    <Input
                      name="hostName_ip"
                      label={intl.messages.hostName_ip}
                      value={values.hostName_ip}
                      onChange={handleChange('hostName_ip')}
                      error={touched.hostName_ip && errors.hostName_ip}
                      onBlur={handleOnBlur}
                    />
                    <Input
                      name="ssh_port"
                      label={intl.messages.ssh_port}
                      value={values.ssh_port}
                      onChange={handleChange('ssh_port')}
                      error={touched.ssh_port && errors.ssh_port}
                      onBlur={handleOnBlur}
                    />
                    <Input
                      name="ssh_key_path"
                      label={intl.messages.ssh_key_path}
                      value={values.ssh_key_path}
                      onChange={handleChange('ssh_key_path')}
                      error={touched.ssh_key_path && errors.ssh_key_path}
                      onBlur={handleOnBlur}
                    />
                    <Input
                      name="sudo_required"
                      type="checkbox"
                      label={intl.messages.sudo_required}
                      value={values.sudo_required}
                      checked={values.sudo_required}
                      onChange={handleChange('sudo_required')}
                      onBlur={handleOnBlur}
                    />
                  </FormSection>
                  <ActionContainer>
                    <div>
                      <div>
                        <Button
                          text={intl.messages.cancel}
                          type="button"
                          outlined
                          onClick={() => this.props.history.push('/nodes')}
                        />
                        <Button
                          text={intl.messages.create}
                          type="submit"
                          disabled={
                            !dirty ||
                            !isEmpty(errors) ||
                            !(
                              values.workload_plane ||
                              values.control_plane ||
                              values.infra
                            )
                          }
                        />
                      </div>
                      <ErrorMessage
                        visible={asyncErrors && asyncErrors.create_node}
                      >
                        {asyncErrors && asyncErrors.create_node}
                      </ErrorMessage>
                    </div>
                  </ActionContainer>
                </Form>
              );
            }}
          </Formik>
        </CreateNodeLayout>
      </CreateNodeContainter>
    );
  }
}

const mapStateToProps = state => ({
  asyncErrors: state.app.nodes.errors,
  clusterVersion: state.app.nodes.clusterVersion,
  theme: state.config.theme
});

const mapDispatchToProps = dispatch => {
  return {
    createNode: body => dispatch(createNodeAction(body)),
    clearCreateNodeError: () => dispatch(clearCreateNodeErrorAction())
  };
};

export default injectIntl(
  withRouter(
    connect(
      mapStateToProps,
      mapDispatchToProps
    )(NodeCreateForm)
  )
);
