import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useHistory, useParams } from 'react-router';
import { isEmpty } from 'lodash';
import { Formik, Form } from 'formik';
import * as yup from 'yup';
import { useIntl } from 'react-intl';
import styled from 'styled-components';
import {
  Loader,
  Breadcrumb,
  Button,
  Input,
  MultiSelect,
} from '@scality/core-ui';
import { padding, fontSize } from '@scality/core-ui/dist/style/theme';

import { useRefreshEffect } from '../services/utils';
import { protectionOptions } from '../constants';
import {
  refreshHyperdriveAction,
  stopRefreshHyperdriveAction,
  createHyperdriveControllerAction,
} from '../ducks/app/hyperdrive';
import {
  BreadcrumbContainer,
  BreadcrumbLabel,
  StyledLink,
} from '../components/BreadcrumbStyle';

const HyperdriveCreationContainer = styled.div`
  display: inline-block;
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
        width: 350px;
        box-sizing: border-box;
      }
      .sc-multi-select-list {
        padding: 0;
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

const HyperdriveCreation = props => {
  const intl = useIntl();
  const history = useHistory();
  const params = useParams();
  const dispatch = useDispatch();

  const config = useSelector(state => state.config);
  const hyperdrives = useSelector(state => state.app.hyperdrive.list);
  const environment = params.name;

  useRefreshEffect(refreshHyperdriveAction, stopRefreshHyperdriveAction, {
    environment,
  });

  const hyperdriveOptions = hyperdrives.map(hyperdrive => ({
    label: hyperdrive.metadata.name,
    value: hyperdrive.metadata.name,
  }));

  const initialValues = {
    name: 'hyperdrive-controller',
    hyperdrives: hyperdriveOptions,
    protections: [protectionOptions[0]],
    // Needed to create a ressource
    environment,
  };

  const validationSchema = yup.object().shape({
    name: yup.string().required(),
    hyperdrives: yup
      .array()
      .min(1)
      .required(),
    protections: yup
      .array()
      .min(1)
      .required(),
  });

  const isFormReady = hyperdrives.length > 0;

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
              {intl.messages.create_hyperdrive_controller}
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
              const newHyperdriveController = {
                ...values,
              };
              dispatch(
                createHyperdriveControllerAction(newHyperdriveController),
              );
            }}
          >
            {formProps => {
              const {
                values,
                touched,
                errors,
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

              const onRemoveSelectItem = field => value => {
                setFieldValue(
                  field,
                  values[field].filter(p => p.label !== value),
                  true,
                );
              };

              const onSelectProtectionOption = value => {
                const newProtectionSelection = [
                  ...values.protections,
                  protectionOptions.find(t => t.label === value.label),
                ];
                setFieldValue('protections', newProtectionSelection, true);
              };

              const onSelectHDOption = value => {
                const newHyperdrivesSelection = [
                  ...values.hyperdrives,
                  hyperdriveOptions.find(hdo => hdo.label === value.label),
                ];

                setFieldValue('hyperdrives', newHyperdrivesSelection, true);
              };

              const availableProtections = protectionOptions.filter(
                protection =>
                  !values.protections.find(p => p.label === protection.label),
              );

              const availableHyperdrives = hyperdriveOptions.filter(
                hdo => !values.hyperdrives.find(hd => hd.label === hdo.label),
              );

              //touched is not "always" correctly set
              const handleOnBlur = e => setFieldTouched(e.target.name, true);

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
                    <InputContainer className="sc-input">
                      <InputLabel className="sc-input-label">
                        {intl.messages.hyperdrives}
                      </InputLabel>
                      <MultiSelect
                        name="hyperdrives"
                        items={values.hyperdrives}
                        search={{
                          options: availableHyperdrives,
                          onSelect: onSelectHDOption,
                          selectedOption: null,
                        }}
                        onItemRemove={onRemoveSelectItem('hyperdrives')}
                      />
                    </InputContainer>

                    <InputContainer className="sc-input">
                      <InputLabel className="sc-input-label">
                        {'Protection Types'}
                      </InputLabel>
                      <MultiSelect
                        name="protections"
                        items={values.protections}
                        search={{
                          options: availableProtections,
                          onSelect: onSelectProtectionOption,
                          selectedOption: null,
                        }}
                        onItemRemove={onRemoveSelectItem('protections')}
                      />
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

export default HyperdriveCreation;
