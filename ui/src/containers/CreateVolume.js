import React, { useEffect } from 'react';
import { connect, useSelector } from 'react-redux';
import Modal from 'react-modal';
import { Formik, Form } from 'formik';
import * as yup from 'yup';
import { injectIntl } from 'react-intl';
import styled from 'styled-components';
import Loader from '../components/Loader';
import { Input, Button, Breadcrumb } from '@scality/core-ui';
import { isEmpty } from 'lodash';
import {
  fetchStorageClassAction,
  createVolumeAction
} from '../ducks/app/volumes';
import {
  fontSize,
  padding,
  grayLightest
} from '@scality/core-ui/dist/style/theme';
import { SPARSE_LOOP_DEVICE, RAW_BLOCK_DEVICE } from '../constants';
import {
  BreadcrumbContainer,
  BreadcrumbLabel,
  StyledLink
} from '../components/BreadcrumbStyle';
import { sizeUnits } from '../services/utils';

// We might want to do a factorization later for
// form styled components
const CreateVolumeContainer = styled.div`
  height: 100%;
  padding: ${padding.base};
  display: inline-block;
`;

const FormSection = styled.div`
  padding: 0 ${padding.larger};
  display: flex;
  flex-direction: column;
  .sc-input-wrapper {
    width: 200px;
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

const CreateVolumeLayout = styled.div`
  display: inline-block;
  margin-top: ${padding.base};
  form {
    .sc-input {
      display: inline-flex;
      margin: ${padding.smaller} 0;
      .sc-input-label {
        width: 200px;
      }
    }
  }
`;

const SelectLabel = styled.label`
  width: 200px;
  padding: 10px;
  font-size: ${fontSize.base};
`;

const SelectFieldContainer = styled.div`
  display: inline-flex;
  align-items: center;
`;

const SelectField = styled.select`
  width: 200px;
`;

const SizeFieldContainer = styled.div`
  display: inline-flex;
  align-items: center;
  .sc-input-wrapper {
    width: 150px;
  }
  .size-unit-input {
    width: 100%;
    box-sizing: border-box;
  }
`;

const SizeUnitFieldSelectContainer = styled.div`
  width: 50px;
  padding-left: 5px;
`;

const ModalNoStorageClass = styled(Modal)`
  position: absolute;
  width: 500px;
  height: 150px;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%) !important;
  background-color: ${grayLightest};
  outline: none;
  button {
    margin-left: 400px;
  }
  h4,
  p {
    margin-left: ${padding.larger};
  }
  a {
    text-decoration: none;
  }
`;

const CreateVolume = props => {
  const { theme, intl, match, history, fetchStorageClass } = props;

  useEffect(() => {
    fetchStorageClass();
  }, [fetchStorageClass]);

  const nodeName = props.match.params.id;
  const storageClassesName = props.storageClass.map(
    storageClass => storageClass.metadata.name
  );
  const isSCLoading = useSelector(state => state.app.volumes.isSCLoading);
  // Hardcoded
  const types = [
    { label: 'RawBlockDevice', value: RAW_BLOCK_DEVICE },
    { label: 'SparseLoopDevice', value: SPARSE_LOOP_DEVICE }
  ];

  const initialValues = {
    name: '',
    storageClass: storageClassesName[0],
    type: types[0].value,
    path: '',
    selectedUnit: sizeUnits[3].value,
    sizeInput: ''
  };
  const volumeNameRegex = /^[a-z0-9]([-a-z0-9]*[a-z0-9])?(\.[a-z0-9]([-a-z0-9]*[a-z0-9])?)*$/;
  const positiveIntegerRegex = /^[1-9][0-9]*$/;

  const validationSchema = yup.object().shape({
    name: yup
      .string()
      .matches(volumeNameRegex, intl.messages.volume_name_error)
      .required(
        intl.formatMessage(
          { id: 'generic_missing_field' },
          { field: intl.messages.name.toLowerCase() }
        )
      ),
    storageClass: yup.string().required(),
    type: yup.string().required(),
    path: yup
      .string()
      .matches(/^\//, intl.messages.volume_path_error)
      .when('type', {
        is: RAW_BLOCK_DEVICE,
        then: yup
          .string()
          .required(
            intl.formatMessage(
              { id: 'generic_missing_field' },
              { field: intl.messages.device_path.toLowerCase() }
            )
          )
      }),
    sizeInput: yup.string().when('type', {
      is: SPARSE_LOOP_DEVICE,
      then: yup
        .string()
        .matches(positiveIntegerRegex, intl.messages.volume_size_error)
        .required(
          intl.formatMessage(
            { id: 'generic_missing_field' },
            { field: intl.messages.volume_size.toLowerCase() }
          )
        )
    }),
    selectedUnit: yup.string().when('type', {
      is: SPARSE_LOOP_DEVICE,
      then: yup.string()
    })
  });
  const isStorageClassExist = storageClassesName.length > 0;
  // const isFormReady = storageClassesName.length > 0 && types.length > 0;

  return isSCLoading ? (
    <Loader />
  ) : (
    <CreateVolumeContainer>
      <BreadcrumbContainer>
        <Breadcrumb
          activeColor={theme.brand.secondary}
          paths={[
            <StyledLink to="/nodes">{intl.messages.nodes}</StyledLink>,
            <StyledLink to={`/nodes/${match.params.id}/volumes`}>
              {match.params.id}
            </StyledLink>,
            <BreadcrumbLabel>{intl.messages.create_new_volume}</BreadcrumbLabel>
          ]}
        />
      </BreadcrumbContainer>
      <CreateVolumeLayout>
        <Formik
          initialValues={initialValues}
          validationSchema={validationSchema}
          onSubmit={values => {
            const newVolume = { ...values };
            newVolume.size = `${values.sizeInput}${values.selectedUnit}`;
            props.createVolume(newVolume, nodeName);
          }}
        >
          {formikProps => {
            const {
              values,
              handleChange,
              errors,
              touched,
              setFieldTouched,
              dirty
            } = formikProps;

            //touched is not "always" correctly set
            const handleOnBlur = e => setFieldTouched(e.target.name, true);
            return (
              <Form>
                <FormSection>
                  <Input
                    name="name"
                    value={values.name}
                    onChange={handleChange('name')}
                    label={intl.messages.name}
                    error={touched.name && errors.name}
                    onBlur={handleOnBlur}
                  />
                  <SelectFieldContainer>
                    <SelectLabel>{intl.messages.storageClass}</SelectLabel>
                    <SelectField
                      name="storageClass"
                      onChange={handleChange('storageClass')}
                      value={values.storageClass}
                      error={touched.storageClass && errors.storageClass}
                      onBlur={handleOnBlur}
                    >
                      {storageClassesName.map((SCName, idx) => (
                        <option key={`storageClass_${idx}`} value={SCName}>
                          {SCName}
                        </option>
                      ))}
                    </SelectField>
                  </SelectFieldContainer>
                  <SelectFieldContainer>
                    <SelectLabel>{intl.messages.type}</SelectLabel>
                    <SelectField
                      name="type"
                      onChange={handleChange('type')}
                      error={touched.type && errors.type}
                      onBlur={handleOnBlur}
                    >
                      {types.map((type, idx) => (
                        <option key={`type_${idx}`} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </SelectField>
                  </SelectFieldContainer>

                  {values.type === SPARSE_LOOP_DEVICE ? (
                    <SizeFieldContainer>
                      <Input
                        name="sizeInput"
                        className="size-unit-input"
                        type="number"
                        min="1"
                        value={values.sizeInput}
                        onChange={handleChange('sizeInput')}
                        label={intl.messages.volume_size}
                        error={touched.sizeInput && errors.sizeInput}
                        onBlur={handleOnBlur}
                      />
                      <SizeUnitFieldSelectContainer>
                        <select
                          name="selectedUnit"
                          value={values.selectedUnit}
                          onChange={handleChange('selectedUnit')}
                          error={touched.selectedUnit && errors.selectedUnit}
                          onBlur={handleOnBlur}
                        >
                          {sizeUnits
                            /**
                             * `sizeUnits` have a base 2 and base 10 units
                             * (ie. KiB and KB).
                             * We chose to only display base 2 units
                             * to improve the UX.
                             */
                            .filter((size, idx) => idx < 6)
                            .map(({ label, value }, idx) => {
                              return (
                                <option key={`sizeUnits_${idx}`} value={value}>
                                  {label}
                                </option>
                              );
                            })}
                        </select>
                      </SizeUnitFieldSelectContainer>
                    </SizeFieldContainer>
                  ) : (
                    <Input
                      name="path"
                      value={values.path}
                      onChange={handleChange('path')}
                      label={intl.messages.device_path}
                      error={touched.path && errors.path}
                      onBlur={handleOnBlur}
                    />
                  )}
                </FormSection>
                <ActionContainer>
                  <Button
                    text={intl.messages.cancel}
                    type="button"
                    outlined
                    onClick={() =>
                      history.push(`/nodes/${match.params.id}/volumes`)
                    }
                  />
                  <Button
                    text={intl.messages.create}
                    type="submit"
                    disabled={!dirty || !isEmpty(errors)}
                  />
                </ActionContainer>
              </Form>
            );
          }}
        </Formik>
      </CreateVolumeLayout>
      <ModalNoStorageClass isOpen={!isStorageClassExist} ariaHideApp={false}>
        {/* Need translation here^^ */}
        <h4>No Storage Class found</h4>
        <p>
          Please create one from Kubernetes.
          <a
            // eslint-disable-next-line react/jsx-no-target-blank
            target="_blank"
            href="https://kubernetes.io/docs/concepts/storage/storage-classes/#the-storageclass-resource"
          >
            Learn more
          </a>
        </p>
        <Button
          text={intl.messages.cancel}
          type="button"
          outlined
          onClick={() => history.push(`/nodes/${match.params.id}/volumes`)}
        />
      </ModalNoStorageClass>
    </CreateVolumeContainer>
  );
};

const mapStateToProps = state => ({
  storageClass: state.app.volumes.storageClass,
  theme: state.config.theme
});

const mapDispatchToProps = dispatch => {
  return {
    fetchStorageClass: () => dispatch(fetchStorageClassAction()),
    createVolume: (body, nodeName) =>
      dispatch(createVolumeAction(body, nodeName))
  };
};

export default injectIntl(
  connect(
    mapStateToProps,
    mapDispatchToProps
  )(CreateVolume)
);
