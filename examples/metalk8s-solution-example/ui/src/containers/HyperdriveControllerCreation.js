import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { useHistory, useParams } from 'react-router';
import { isEmpty } from 'lodash';
import { Formik, Form } from 'formik';
import * as yup from 'yup';
import { useIntl } from 'react-intl';
import styled from 'styled-components';
import { Loader, Breadcrumb, Button, Input } from '@scality/core-ui';
import { padding, fontSize } from '@scality/core-ui/dist/style/theme';

import { useRefreshEffect } from '../services/utils';
import {
  refreshVolumesAction,
  stopRefreshVolumesAction,
  refreshNodesAction,
  stopRefreshNodesAction,
} from '../ducks/app/hyperdrive';
import {
  BreadcrumbContainer,
  BreadcrumbLabel,
  StyledLink,
} from '../components/BreadcrumbStyle';

const HyperdriveCreationContainer = styled.div`
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  height: 100%;
  padding: ${padding.base};
`;

const HyperdriveCreationLayout = styled.div`
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

const HyperdriveControllerCreation = props => {
  const intl = useIntl();
  const history = useHistory();
  const params = useParams();

  const config = useSelector(state => state.config);
  const hyperdrives = useSelector(state => state.app.hyperdrive);
  const nodes = useSelector(state => state.app.hyperdrive.nodes);
  const volumes = useSelector(state => state.app.hyperdrive.volumes);
  const [nodeVolumes, setNodeVolumes] = useState([]);

  // console.log('HyperdriveCreation', hyperdrives);

  useRefreshEffect(refreshVolumesAction, stopRefreshVolumesAction);
  useRefreshEffect(refreshNodesAction, stopRefreshNodesAction);

  const nodeOptions = nodes.map(node => ({
    label: node.metadata.name,
    value: node.metadata.name,
  }));

  const initialValues = {
    name: '',
    node: nodeOptions[0],
    indexVolume: volumes.filter(
      volume =>
        volume.spec.nodeName === nodeOptions[0]?.label &&
        volume.spec.storageClassName === 'hyperdrive-index',
    ),
    dataVolumes: volumes.filter(
      volume =>
        volume.spec.nodeName === nodeOptions[0]?.label &&
        volume.spec.storageClassName === 'hyperdrive-data',
    ),
  };

  const validationSchema = yup.object().shape({
    name: yup.string().required(),
    node: yup.object().required(),
    indexVolume: yup
      .array()
      .min(1)
      .max(1)
      .required(),
    dataVolumes: yup.array().required(),
  });

  const isFormReady = nodes.length > 0;

  return (
    <HyperdriveCreationContainer>
      <BreadcrumbContainer>
        <Breadcrumb
          activeColor={config.theme.brand.secondary}
          paths={[
            <StyledLink to="/environments">
              {intl.messages.environments}
            </StyledLink>,
            <StyledLink to={`/environments/${params.name}`}>
              {params.name}
            </StyledLink>,
            <BreadcrumbLabel title={intl.messages.create_hyperdrive_controller}>
              {intl.messages.create_hyperdrive}
            </BreadcrumbLabel>,
          ]}
        />
      </BreadcrumbContainer>
      <HyperdriveCreationLayout>
        {isFormReady ? (
          <Formik
            initialValues={initialValues}
            validationSchema={validationSchema}
            onSubmit={values => {
              // TODO
              console.log('values', values);
            }}
          >
            {formProps => {
              const {
                values,
                touched,
                errors,
                dirty,
                setFieldTouched,
                setFieldValue,
              } = formProps;

              //handleChange of the Formik props does not update 'values' when field value is empty
              const handleChange = field => e => {
                const { value, checked, type } = e.target;
                setFieldValue(
                  field,
                  type === 'checkbox' ? checked : value,
                  true,
                );
              };

              const handleNodeChange = selectedObj => {
                setFieldValue('node', selectedObj);

                setFieldValue(
                  'indexVolume',
                  volumes.filter(
                    volume =>
                      volume.spec.nodeName === selectedObj.label &&
                      volume.spec.storageClassName === 'hyperdrive-index',
                  ),
                );

                setFieldValue(
                  'dataVolumes',
                  volumes.filter(
                    volume =>
                      volume.spec.nodeName === selectedObj.label &&
                      volume.spec.storageClassName === 'hyperdrive-data',
                  ),
                );
              };

              //touched is not "always" correctly set
              const handleOnBlur = e => setFieldTouched(e.target.name, true);

              console.log('errors', errors);
              console.log('values', values);
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
                      name="node"
                      label={intl.messages.node}
                      type="select"
                      options={nodeOptions}
                      placeholder={intl.messages.node}
                      onChange={handleNodeChange}
                      value={values.node}
                      error={touched.version && errors.version}
                      onBlur={handleOnBlur}
                    />
                    <InputContainer className="sc-input">
                      <InputLabel className="sc-input-label">
                        {intl.messages.index_volume}
                      </InputLabel>
                      <InputValue>
                        {values?.indexVolume[0]?.metadata?.name}
                      </InputValue>
                    </InputContainer>
                    <InputContainer className="sc-input">
                      <InputLabel className="sc-input-label">
                        {intl.messages.data_volumes}
                      </InputLabel>
                      <InputValue>
                        {`${values?.dataVolumes?.length} volume(s) available on this node`}
                      </InputValue>
                    </InputContainer>

                    <ActionContainer>
                      <div>
                        <Button
                          text={intl.messages.cancel}
                          type="button"
                          outlined
                          onClick={() =>
                            history.push(`/environments/${params.name}`)
                          }
                        />
                        <Button
                          text={intl.messages.create}
                          type="submit"
                          disabled={!isEmpty(errors)}
                        />
                      </div>
                    </ActionContainer>
                  </FormSection>
                </Form>
              );
            }}
          </Formik>
        ) : (
          <Loader />
        )}
      </HyperdriveCreationLayout>
    </HyperdriveCreationContainer>
  );
};

export default HyperdriveControllerCreation;
