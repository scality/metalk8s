import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import styled from 'styled-components';
import { Formik, Form } from 'formik';
import * as yup from 'yup';
import { useHistory } from 'react-router';
import { Button, Input, Checkbox, Breadcrumb } from '@scality/core-ui';
import { padding, fontSize } from '@scality/core-ui/dist/style/theme';
import isEmpty from 'lodash.isempty';
import {
  createNodeAction,
  clearCreateNodeErrorAction,
} from '../ducks/app/nodes';
import {
  BreadcrumbContainer,
  BreadcrumbLabel,
  StyledLink,
} from '../components/BreadcrumbStyle';
import { intl } from '../translations/IntlGlobalProvider';

const CreateNodeContainter = styled.div`
  height: 100%;
  padding-left: ${padding.base};
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
        color: ${(props) => props.theme.brand.textPrimary};
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
  visibility: ${(props) => (props.visible ? 'visible' : 'hidden')};
  color: ${(props) => props.theme.brand.danger};
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
  color: ${(props) => props.theme.brand.textPrimary};
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
  color: ${(props) => props.theme.brand.textPrimary};
`;

const InputValue = styled(InputLabel)`
  padding: ${padding.small} 0;
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
  infra: false,
};

const validationSchema = yup.object().shape({
  name: yup.string().required(),
  ssh_user: yup.string().required(),
  hostName_ip: yup.string().required(),
  ssh_port: yup.number().min(0).max(65535).required(),
  ssh_key_path: yup.string().required(),
  sudo_required: yup.boolean().required(),
  workload_plane: yup.boolean().required(),
  control_plane: yup.boolean().required(),
  infra: yup.boolean().required(),
});

const NodeCreateForm = () => {
  const asyncErrors = useSelector((state) => state.app.nodes.errors);
  const clusterVersion = useSelector((state) => state.app.nodes.clusterVersion);
  const theme = useSelector((state) => state.config.theme);
  const dispatch = useDispatch();
  const createNode = (body) => dispatch(createNodeAction(body));
  const history = useHistory();

  useEffect(() => {
    return () => {
      dispatch(clearCreateNodeErrorAction());
    };
  }, [dispatch]);

  return (
    <CreateNodeContainter>
      <BreadcrumbContainer>
        <Breadcrumb
          activeColor={theme.brand.secondary}
          paths={[
            <StyledLink to="/nodes">{intl.translate('nodes')}</StyledLink>,
            <BreadcrumbLabel>
              {intl.translate('create_new_node')}
            </BreadcrumbLabel>,
          ]}
        />
      </BreadcrumbContainer>
      <CreateNodeLayout>
        <Formik
          initialValues={initialValues}
          validationSchema={validationSchema}
          onSubmit={createNode}
        >
          {(props) => {
            const {
              values,
              touched,
              errors,
              dirty,
              setFieldTouched,
              setFieldValue,
            } = props;

            //handleChange of the Formik props does not update 'values' when field value is empty
            const handleChange = (field) => (e) => {
              const { value, checked, type } = e.target;
              setFieldValue(field, type === 'checkbox' ? checked : value, true);
            };
            //touched is not "always" correctly set
            const handleOnBlur = (e) => setFieldTouched(e.target.name, true);

            return (
              <Form>
                <FormSection>
                  <FormSectionTitle>
                    {intl.translate('new_node_data')}
                  </FormSectionTitle>
                  <Input
                    name="name"
                    label={intl.translate('name')}
                    value={values.name}
                    onChange={handleChange('name')}
                    error={touched.name && errors.name}
                    onBlur={handleOnBlur}
                  />
                  <InputContainer className="sc-input">
                    <InputLabel className="sc-input-label">
                      {intl.translate('version')}
                    </InputLabel>
                    <InputValue>{clusterVersion}</InputValue>
                  </InputContainer>
                  <InputContainer className="sc-input">
                    <InputLabel className="sc-input-label">
                      {intl.translate('roles')}
                    </InputLabel>
                    <CheckboxGroup>
                      <Checkbox
                        name="workload_plane"
                        label={intl.translate('workload_plane')}
                        checked={values.workload_plane}
                        value={values.workload_plane}
                        onChange={handleChange('workload_plane')}
                        onBlur={handleOnBlur}
                      />
                      <Checkbox
                        name="control_plane"
                        label={intl.translate('control_plane')}
                        checked={values.control_plane}
                        value={values.control_plane}
                        onChange={handleChange('control_plane')}
                        onBlur={handleOnBlur}
                      />
                      <Checkbox
                        name="infra"
                        label={intl.translate('infra')}
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
                        {intl.translate('role_values_error')}
                      </ErrorMessage>
                    </CheckboxGroup>
                  </InputContainer>
                </FormSection>

                <FormSection>
                  <FormSectionTitle>
                    {intl.translate('new_node_access')}
                  </FormSectionTitle>
                  <Input
                    name="ssh_user"
                    label={intl.translate('ssh_user')}
                    value={values.ssh_user}
                    onChange={handleChange('ssh_user')}
                    error={touched.ssh_user && errors.ssh_user}
                    onBlur={handleOnBlur}
                  />
                  <Input
                    name="hostName_ip"
                    label={intl.translate('hostName_ip')}
                    value={values.hostName_ip}
                    onChange={handleChange('hostName_ip')}
                    error={touched.hostName_ip && errors.hostName_ip}
                    onBlur={handleOnBlur}
                  />
                  <Input
                    name="ssh_port"
                    label={intl.translate('ssh_port')}
                    value={values.ssh_port}
                    onChange={handleChange('ssh_port')}
                    error={touched.ssh_port && errors.ssh_port}
                    onBlur={handleOnBlur}
                  />
                  <Input
                    name="ssh_key_path"
                    label={intl.translate('ssh_key_path')}
                    value={values.ssh_key_path}
                    onChange={handleChange('ssh_key_path')}
                    error={touched.ssh_key_path && errors.ssh_key_path}
                    onBlur={handleOnBlur}
                  />
                  <Input
                    name="sudo_required"
                    type="checkbox"
                    label={intl.translate('sudo_required')}
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
                        text={intl.translate('cancel')}
                        type="button"
                        outlined
                        onClick={() => history.push('/nodes')}
                      />
                      <Button
                        text={intl.translate('create')}
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
};

export default NodeCreateForm;
