import React from 'react';
import {
  Banner,
  Checkbox,
  Form,
  FormGroup,
  FormSection,
  Icon,
  Stack,
  Text,
  Toggle,
} from '@scality/core-ui';
import { Button, Input } from '@scality/core-ui/dist/next';
import { fontSize, padding } from '@scality/core-ui/dist/style/theme';
import { Formik } from 'formik';
import isEmpty from 'lodash.isempty';
import { useEffect } from 'react';
import { useIntl } from 'react-intl';
import { useDispatch, useSelector } from 'react-redux';
import { useHistory } from 'react-router';
import styled from 'styled-components';
import * as yup from 'yup';
import {
  clearCreateNodeErrorAction,
  createNodeAction,
  fetchClusterVersionAction,
} from '../ducks/app/nodes';
import { useShellConfig } from './PrivateRoute';
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
  // @ts-expect-error - FIXME when you are working on it
  const asyncErrors = useSelector((state) => state.app.nodes.errors);
  // @ts-expect-error - FIXME when you are working on it
  const clusterVersion = useSelector((state) => state.app.nodes.clusterVersion);
  const dispatch = useDispatch();

  const createNode = (body) => dispatch(createNodeAction(body));

  const shellConfig = useShellConfig();
  const productName = shellConfig?.config?.productName;
  const isMetalK8s = productName === 'MetalK8s';

  const initialValues = {
    name: '',
    ssh_user: isMetalK8s ? '' : 'artesca-os',
    hostName_ip: '',
    ssh_port: '22',
    ssh_key_path: '/etc/metalk8s/pki/salt-bootstrap',
    sudo_required: isMetalK8s ? false : true,
    workload_plane: true,
    control_plane: false,
    infra: false,
  };

  const history = useHistory();
  const intl = useIntl();
  useEffect(() => {
    dispatch(fetchClusterVersionAction());
    return () => {
      dispatch(clearCreateNodeErrorAction());
    };
  }, [dispatch]);
  return (
    <Formik
      initialValues={initialValues}
      validationSchema={validationSchema}
      // @ts-expect-error - FIXME when you are working on it
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
          handleSubmit,
        } = props;

        //handleChange of the Formik props does not update 'values' when field value is empty
        const handleChange = (field) => (e) => {
          const { value, checked, type } = e.target;
          setFieldValue(field, type === 'checkbox' ? checked : value, true);
        };

        //touched is not "always" correctly set
        const handleOnBlur = (e) => setFieldTouched(e.target.name, true);

        return (
          <Form
            requireMode="partial"
            layout={{
              kind: 'page',
              title: 'Create New Node',
            }}
            onSubmit={handleSubmit}
            banner={
              asyncErrors &&
              asyncErrors.create_node && (
                <Banner
                  icon={<Icon name="Exclamation-triangle" />}
                  title="Error"
                  variant="danger"
                >
                  {asyncErrors.create_node}
                </Banner>
              )
            }
            rightActions={
              <Stack gap="r16">
                <Button
                  label={intl.formatMessage({
                    id: 'cancel',
                  })}
                  type="button"
                  variant="outline"
                  onClick={() => history.goBack()}
                />
                <Button
                  label={intl.formatMessage({
                    id: 'create',
                  })}
                  variant="primary"
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
              </Stack>
            }
          >
            <FormSection
              title={{
                name: intl.formatMessage({
                  id: 'new_node_data',
                }),
              }}
            >
              <FormGroup
                label={intl.formatMessage({
                  id: 'name',
                })}
                required
                id="name"
                // @ts-expect-error - FIXME when you are working on it
                error={touched.name && errors.name}
                helpErrorPosition="bottom"
                content={
                  <Input
                    name="name"
                    id="name"
                    value={values.name}
                    autoFocus
                    onChange={handleChange('name')}
                    onBlur={handleOnBlur}
                  />
                }
              />

              <FormGroup
                label={intl.formatMessage({
                  id: 'metalk8s_version',
                })}
                id="metalk8s_version"
                content={<Text variant="Basic">{clusterVersion}</Text>}
              />

              {isMetalK8s ? (
                <FormGroup
                  label={intl.formatMessage({
                    id: 'roles',
                  })}
                  id="roles"
                  helpErrorPosition="bottom"
                  error={
                    !(
                      values.workload_plane ||
                      values.control_plane ||
                      values.infra
                    )
                      ? intl.formatMessage({
                          id: 'role_values_error',
                        })
                      : undefined
                  }
                  content={
                    <CheckboxGroup>
                      <Checkbox
                        name="workload_plane"
                        label={intl.formatMessage({
                          id: 'workload_plane',
                        })}
                        checked={values.workload_plane}
                        value={values.workload_plane}
                        onChange={handleChange('workload_plane')}
                        onBlur={handleOnBlur}
                      />
                      <Checkbox
                        name="control_plane"
                        label={intl.formatMessage({
                          id: 'control_plane',
                        })}
                        checked={values.control_plane}
                        value={values.control_plane}
                        onChange={handleChange('control_plane')}
                        onBlur={handleOnBlur}
                      />

                      <Checkbox
                        name="infra"
                        label={intl.formatMessage({
                          id: 'infra',
                        })}
                        checked={values.infra}
                        value={values.infra}
                        onChange={handleChange('infra')}
                        onBlur={handleOnBlur}
                      />
                    </CheckboxGroup>
                  }
                />
              ) : (
                <></>
              )}
            </FormSection>

            <FormSection
              title={{
                name: intl.formatMessage({
                  id: 'new_node_access',
                }),
              }}
            >
              <FormGroup
                label={intl.formatMessage({
                  id: 'ssh_user',
                })}
                required
                id="ssh_user"
                helpErrorPosition="bottom"
                // @ts-expect-error - FIXME when you are working on it
                error={touched.ssh_user && errors.ssh_user}
                content={
                  <Input
                    name="ssh_user"
                    id="ssh_user"
                    value={values.ssh_user}
                    onChange={handleChange('ssh_user')}
                    onBlur={handleOnBlur}
                  />
                }
                disabled={!isMetalK8s}
              />

              <FormGroup
                label={intl.formatMessage({
                  id: 'hostName_ip',
                })}
                required
                id="hostName_ip"
                helpErrorPosition="bottom"
                // @ts-expect-error - FIXME when you are working on it
                error={touched.hostName_ip && errors.hostName_ip}
                content={
                  <Input
                    name="hostName_ip"
                    id="hostName_ip"
                    value={values.hostName_ip}
                    onChange={handleChange('hostName_ip')}
                    onBlur={handleOnBlur}
                  />
                }
              />

              <FormGroup
                label={intl.formatMessage({
                  id: 'ssh_port',
                })}
                required
                id="ssh_port"
                helpErrorPosition="bottom"
                // @ts-expect-error - FIXME when you are working on it
                error={touched.ssh_port && errors.ssh_port}
                content={
                  <Input
                    name="ssh_port"
                    id="ssh_port"
                    value={values.ssh_port}
                    onChange={handleChange('ssh_port')}
                    onBlur={handleOnBlur}
                  />
                }
              />

              <FormGroup
                label={intl.formatMessage({
                  id: 'ssh_key_path',
                })}
                required
                id="ssh_key_path"
                helpErrorPosition="bottom"
                // @ts-expect-error - FIXME when you are working on it
                error={touched.ssh_key_path && errors.ssh_key_path}
                content={
                  <Input
                    name="ssh_key_path"
                    id="ssh_key_path"
                    value={values.ssh_key_path}
                    onChange={handleChange('ssh_key_path')}
                    onBlur={handleOnBlur}
                  />
                }
              />

              <FormGroup
                label={intl.formatMessage({
                  id: 'sudo_required',
                })}
                id="sudo_required"
                content={
                  <Toggle
                    name="sudo_required"
                    toggle={values.sudo_required}
                    value={values.sudo_required}
                    onChange={handleChange('sudo_required')}
                    onBlur={handleOnBlur}
                    disabled={!isMetalK8s}
                  />
                }
                disabled={!isMetalK8s}
              />
            </FormSection>
          </Form>
        );
      }}
    </Formik>
  );
};

export default NodeCreateForm;
