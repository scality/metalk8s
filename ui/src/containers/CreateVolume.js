import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useHistory } from 'react-router';
import {
  Formik,
  Form,
  FieldArray,
  useFormikContext,
  useField,
  Field,
} from 'formik';
import * as yup from 'yup';
import styled from 'styled-components';
import {
  Input,
  Button,
  Banner,
  Tooltip,
  Checkbox,
  Loader,
} from '@scality/core-ui';
import isEmpty from 'lodash.isempty';
import {
  fetchStorageClassAction,
  createVolumesAction,
} from '../ducks/app/volumes';
import { fetchNodesAction } from '../ducks/app/nodes';
import {
  padding,
  fontSize,
  fontWeight,
} from '@scality/core-ui/dist/style/theme';
import {
  SPARSE_LOOP_DEVICE,
  RAW_BLOCK_DEVICE,
  LVM_LOGICAL_VOLUME,
} from '../constants';
import {
  sizeUnits,
  useURLQuery,
  linuxDrivesNamingIncrement,
} from '../services/utils';
import {
  formatVolumeCreationData,
  formatBatchName,
} from '../services/NodeVolumesUtils';
import { intl } from '../translations/IntlGlobalProvider';
import {
  TitlePage,
  CenteredPageContainer,
} from '../components/style/CommonLayoutStyle';

const MAX_VOLUME_BATCH_CREATION = 70;

const PageContainer = styled(CenteredPageContainer)`
  height: calc(100vh - 48px);
  overflow: auto;
`;

// We might want to do a factorization later for
// form styled components
const CreateVolumeFormContainer = styled.div`
  display: inline-block;
  padding: ${padding.small} ${padding.large};
`;

const FormSection = styled.div`
  display: flex;
  padding: 0 ${padding.larger};
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
      margin-bottom: ${padding.large};
      .sc-input-label {
        width: 150px;
        color: ${(props) => props.theme.textPrimary};
      }

      // Avoid double margins for nested sc-inputs
      .sc-input {
        margin-bottom: 0px;
      }
    }
  }
  .sc-select-option-label,
  .sc-select__placeholder {
    font-size: ${fontSize.base};
  }
`;

const SizeFieldContainer = styled.div`
  display: inline-flex;
  align-items: flex-start;
  .sc-input-wrapper,
  .sc-input-type {
    width: 100px;
    box-sizing: border-box;
    height: 38px;
  }
`;

const SizeUnitFieldSelectContainer = styled.div`
  .sc-select {
    width: 100px;
    padding-left: 5px;
  }
`;

const InputContainer = styled.div`
  display: flex;
  align-items: center;
`;

const InputLabel = styled.label`
  padding: ${padding.small};
  font-size: ${fontSize.base};
  color: ${(props) => props.theme.textPrimary};
  .sc-input-label {
    color: ${(props) => props.theme.textPrimary};
  }
`;

const LabelsContainer = styled.div`
  display: flex;
  flex-direction: column;
`;

const LabelsForm = styled.div`
  display: inline-block;
  .sc-input-wrapper {
    margin-right: ${padding.small};
  }
`;

const LabelsList = styled.div`
  margin: ${padding.small} 0;
  max-height: 200px;
  overflow: auto;
`;

const LabelsKeyValue = styled.div`
  display: flex;
`;

const LabelsValue = styled.div`
  width: 200px;
  padding-top: ${padding.small};
  margin-right: 12px;
  color: ${(props) => props.theme.textPrimary};
  word-wrap: break-word;
`;

const TitleWrapper = styled.div`
  display: flex;
  justify-content: space-between;
`;

const LabelsName = styled(LabelsValue)`
  font-weight: ${fontWeight.bold};
  color: ${(props) => props.theme.textPrimary};
  word-wrap: break-word;
`;

const CheckboxContainer = styled.div`
  padding: ${padding.base} 0 0 ${padding.small};
  .text {
    font-size: ${fontSize.base};
  }
  .sc-checkbox {
    display: flex;
  }
`;

const MultiCreationFormContainer = styled.div`
  padding-left: ${padding.base};
  display: flex;
  flex-direction: column;
  color: ${(props) => props.theme.textPrimary};
  font-size: ${fontSize.base};
`;

const SingleVolumeContainer = styled.div`
  display: flex;
  align-items: flex-start;
  padding: ${padding.base} 0 0 ${padding.larger};
`;

const SingleVolumeForm = styled.div`
  display: flex;
  flex-direction: column;
  padding-left: ${padding.smaller};
`;

const InputQuestionMark = styled.i`
  padding-left: ${padding.small};
  color: ${(props) => props.theme.infoPrimary};
`;

const RequiredText = styled.div`
  color: ${(props) => props.theme.textPrimary};
  font-size: ${fontSize.base};
  margin: ${padding.base} 0 ${padding.large} ${padding.small};
`;

const CreateVolume = (props) => {
  const dispatch = useDispatch();
  const history = useHistory();

  const createVolumes = (newVolumes) =>
    dispatch(createVolumesAction(newVolumes));

  const nodes = useSelector((state) => state.app.nodes.list);
  const storageClass = useSelector((state) => state.app.volumes.storageClass);

  const api = useSelector((state) => state.config.api);

  useEffect(() => {
    dispatch(fetchNodesAction());
    dispatch(fetchStorageClassAction());
  }, [dispatch]);

  const query = useURLQuery();
  const nodeName = query.get('node');

  const storageClassesName = storageClass.map((item) => item.metadata.name);
  const isStorageClassLoading = useSelector(
    (state) => state.app.volumes.isSCLoading,
  );

  // Hardcoded
  const types = [
    {
      label: 'RawBlockDevice',
      value: RAW_BLOCK_DEVICE,
    },
    {
      label: 'SparseLoopDevice',
      value: SPARSE_LOOP_DEVICE,
    },
    {
      label: 'LVMLogicalVolume',
      value: LVM_LOGICAL_VOLUME,
    },
  ];

  const initialValues = {
    name: '',
    node: nodeName ? nodeName : nodes[0]?.name,
    storageClass: storageClassesName[0],
    type: types[0].value,
    path: '',
    selectedUnit: sizeUnits[3].value,
    sizeInput: '',
    vgName: '',
    labels: {},
    labelName: '',
    labelValue: '',
    multiVolumeCreation: false,
    // When the multi-volume creation mode is active, the default/min number is 1.
    numberOfVolumes: 1,
    volumes: [{ name: '', path: '' }],
  };

  // Factorized field for the recommended device path and name
  const RecommendField = (props) => {
    const { fieldname, name, index } = props;
    const { values, touched, setFieldValue } = useFormikContext();
    const [field, meta] = useField(props);

    React.useEffect(() => {
      if (fieldname === 'name') {
        // Set the defaults when the field is empty, means even if we change the global value afterwards,
        // the field of batch volumes will not be override.
        if (
          values.name.trim() !== '' &&
          touched.name &&
          values.volumes[index].name === ''
        ) {
          setFieldValue(name, formatBatchName(values.name, index + 1));
        }
      } else if (fieldname === 'path') {
        if (
          values.path.trim() !== '' &&
          touched.path &&
          values.volumes[index].path === ''
        ) {
          setFieldValue(name, linuxDrivesNamingIncrement(values.path, index));
        }
      }
    }, [
      setFieldValue,
      fieldname,
      name,
      index,
      values.name,
      values.path,
      touched.path,
      touched.name,
      values.volumes,
    ]);

    return (
      <>
        <Input {...props} {...field} />
        {!!meta.touched && !!meta.error && <div>{meta.error}</div>}
      </>
    );
  };

  const volumeNameRegex = /^[a-z0-9]([-a-z0-9]*[a-z0-9])?(\.[a-z0-9]([-a-z0-9]*[a-z0-9])?)*$/;
  /* Valid label keys have two segments: an optional prefix and name, separated by a slash (/).
    https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/#syntax-and-character-set  */
  const labelFullNameRegex = /^([a-z0-9]([-a-z0-9]*[a-z0-9])?(\.[a-z0-9]([-a-z0-9]*[a-z0-9])?)*\/)?(([A-Za-z0-9][-A-Za-z0-9_.]*)?[A-Za-z0-9])$/;
  const labelNamePrefixRegex = /^[a-z0-9]([-a-z0-9]*[a-z0-9])?(\.[a-z0-9]([-a-z0-9]*[a-z0-9])?)*$/;
  const labelValueRegex = /^(([A-Za-z0-9][-A-Za-z0-9_.]*)?[A-Za-z0-9])?$/;
  const positiveIntegerRegex = /^[1-9][0-9]*$/;

  const validationSchema = yup.object().shape({
    name: yup
      .string()
      .matches(volumeNameRegex, intl.translate('name_error'))
      .required(
        intl.translate('generic_missing_field', {
          field: intl.translate('name').toLowerCase(),
        }),
      ),
    node: yup.string().required(),
    storageClass: yup.string().required(),
    type: yup.string().required(),
    path: yup
      .string()
      .matches(/^\//, intl.translate('volume_path_error'))
      .when('type', {
        is: RAW_BLOCK_DEVICE,
        then: yup.string().required(
          intl.translate('generic_missing_field', {
            field: intl.translate('device_path').toLowerCase(),
          }),
        ),
      }),
    sizeInput: yup.string().when('type', {
      is: SPARSE_LOOP_DEVICE,
      then: yup
        .string()
        .matches(positiveIntegerRegex, intl.translate('volume_size_error'))
        .required(
          intl.translate('generic_missing_field', {
            field: intl.translate('volume_size').toLowerCase(),
          }),
        ),
    }),
    selectedUnit: yup.string().when('type', {
      is: SPARSE_LOOP_DEVICE,
      then: yup.string(),
    }),
    vgName: yup.string().when('type', {
      is: LVM_LOGICAL_VOLUME,
      then: yup
        .string()
        .matches(volumeNameRegex, intl.translate('name_error'))
        .required(
          intl.translate('generic_missing_field', {
            field: intl.translate('name_error').toLowerCase(),
          }),
        ),
    }),
    labels: yup.object(),
    labelValue: yup
      .string()
      .matches(labelValueRegex, intl.translate('label_value_error'))
      .max(63, intl.translate('n_character_or_less', { n: 63 })),
    numberOfVolumes: yup
      .number()
      .positive()
      .max(MAX_VOLUME_BATCH_CREATION)
      .integer(),
    volumes: yup.array().of(
      yup.object().shape({
        name: yup
          .string()
          .matches(volumeNameRegex, intl.translate('name_error')),
      }),
    ),
  });

  const isStorageClassExist = storageClassesName.length > 0;

  return isStorageClassLoading ? (
    <Loader size="massive" centered={true} />
  ) : (
    <PageContainer>
      <CreateVolumeFormContainer>
        <TitleWrapper>
          <TitlePage>Create New Volume</TitlePage>
        </TitleWrapper>
        {isStorageClassExist ? null : (
          <Banner
            variant="warning"
            icon={<i className="fas fa-exclamation-triangle" />}
            title={intl.translate('no_storage_class_found')}
          >
            {intl.translate('storage_class_is_required')}
            <a
              rel="noopener noreferrer"
              target="_blank"
              href={`${api.url_doc}/operation/volume_management/storageclass_creation.html`}
            >
              {intl.translate('learn_more')}
            </a>
          </Banner>
        )}
        <CreateVolumeLayout>
          <Formik
            initialValues={initialValues}
            validationSchema={validationSchema}
            onSubmit={(values) => {
              const newVolumes = { ...values };
              newVolumes.size = `${values.sizeInput}${values.selectedUnit}`;
              newVolumes.vgName = `${values.vgName}`;

              const formattedVolumes = formatVolumeCreationData(newVolumes);
              createVolumes(formattedVolumes);
            }}
          >
            {(formikProps) => {
              const {
                values,
                handleChange,
                errors,
                touched,
                setFieldTouched,
                dirty,
                setFieldValue,
              } = formikProps;

              //touched is not "always" correctly set
              const handleOnBlur = (e) => setFieldTouched(e.target.name, true);
              const handleSelectChange = (field) => (selectedObj) => {
                setFieldValue(field, selectedObj ? selectedObj.value : '');
              };
              //get the select item from the object array
              const getSelectedObjectItem = (items, selectedValue) => {
                return items.find((item) => item.value === selectedValue);
              };

              //if re-check the box again, we should only update/pre-fill the defaults for unchanged field.
              // to make sure to keep the user customization.
              const handleCheckboxChange = (field) => (selectedObj) => {
                setFieldValue(field, selectedObj.target.checked);
                // Clear the untouched field to get the update from the global value
                for (let i = 0; i < values.numberOfVolumes; i++) {
                  if (!touched?.volumes?.[i]?.name) {
                    setFieldValue(`volumes[${i}]name`, '');
                  }
                  if (!touched?.volumes?.[i]?.path) {
                    setFieldValue(`volumes[${i}]path`, '');
                  }
                }
              };

              const validataLabelName = (value) => {
                if (!value) return false;

                let error;
                const isLabelNameMatched = labelFullNameRegex.test(value);
                if (!isLabelNameMatched) {
                  const hasLabelPrefix = value.includes('/');

                  if (hasLabelPrefix) {
                    const prefix = value.split('/')[0];
                    const isLabelPrefixMatched = labelNamePrefixRegex.test(
                      prefix,
                    );
                    error = intl.translate(
                      isLabelPrefixMatched
                        ? 'label_name_error'
                        : 'label_prefix_name_error',
                    );
                  } else {
                    error = intl.translate('label_name_error');
                  }
                }
                return error;
              };

              const addLabel = () => {
                const labels = values.labels;

                labels[values.labelName] = values.labelValue;
                setFieldValue('labels', labels);

                setFieldValue('labelName', '');
                setFieldValue('labelValue', '');
              };

              const removeLabel = (key) => {
                const labels = values.labels;
                delete labels[key];
                setFieldValue('labels', labels);
              };

              // Update the number of the volumes to create base on the input number
              const setVolumeNumber = (field, arrayHelpers) => (
                selectedObj,
              ) => {
                const inputVolNum = selectedObj.target.value;
                const preVolNum = values.numberOfVolumes;

                setFieldValue(field, inputVolNum);
                const diff = preVolNum - inputVolNum;
                if (diff > 0) {
                  // REMOVE volume object from `values.volumes` base on the index
                  for (let i = preVolNum - 1; i >= inputVolNum; i--) {
                    arrayHelpers.remove(i);
                  }
                } else if (diff < 0) {
                  // PUSH new volume object to `values.volumes`
                  let absDiff = Math.abs(diff);
                  while (absDiff--) {
                    arrayHelpers.push({
                      name: '',
                      path: '',
                    });
                  }
                }
              };

              const optionsStorageClasses = storageClassesName.map((SCName) => {
                return {
                  label: SCName,
                  value: SCName,
                  'data-cy': `storageClass-${SCName}`,
                };
              });
              const optionsTypes = types.map(({ label, value }) => {
                return {
                  label,
                  value,
                  'data-cy': `type-${value}`,
                };
              });

              const optionsSizeUnits = sizeUnits
                /**
                 * `sizeUnits` have a base 2 and base 10 units
                 * (ie. KiB and KB).
                 * We chose to only display base 2 units
                 * to improve the UX.
                 */
                .filter((size, idx) => idx < 6)
                .map(({ label, value }) => {
                  return {
                    label,
                    value,
                    'data-cy': `size-${label}`,
                  };
                });

              const optionsNodes = nodes?.map((node) => {
                return {
                  label: node.name,
                  value: node.name,
                  'data-cy': `node-${node.name}`,
                };
              });

              const sizeInputCombinedField = () => {
                return (
                  <SizeFieldContainer>
                    <Input
                      name="sizeInput"
                      type="number"
                      min="1"
                      value={values.sizeInput}
                      onChange={handleChange('sizeInput')}
                      label={`${intl.translate('volume_size')}*`}
                      error={touched.sizeInput && errors.sizeInput}
                      onBlur={handleOnBlur}
                    />
                    <SizeUnitFieldSelectContainer>
                      <Input
                        clearable={false}
                        type="select"
                        options={optionsSizeUnits}
                        noOptionsMessage={() => intl.translate('no_results')}
                        name="selectedUnit"
                        onChange={handleSelectChange('selectedUnit')}
                        value={getSelectedObjectItem(
                          optionsSizeUnits,
                          values?.selectedUnit,
                        )}
                        error={touched.selectedUnit && errors.selectedUnit}
                        onBlur={handleOnBlur}
                      />
                    </SizeUnitFieldSelectContainer>
                  </SizeFieldContainer>
                );
              };

              // render the fields specifically for different volume types
              const renderVolumeTypeSpecificFields = (volumeType) => {
                switch (volumeType) {
                  case SPARSE_LOOP_DEVICE:
                    return sizeInputCombinedField();
                  case RAW_BLOCK_DEVICE:
                    return (
                      <Input
                        name="path"
                        value={values.path}
                        onChange={handleChange('path')}
                        label={
                          <>
                            {`${intl.translate('device_path')}*`}
                            <Tooltip
                              placement="right"
                              overlay={
                                <div style={{ minWidth: '200px' }}>
                                  {intl.translate('device_path_explanation')}
                                </div>
                              }
                            >
                              <InputQuestionMark className="fas fa-question-circle"></InputQuestionMark>
                            </Tooltip>
                          </>
                        }
                        error={touched.path && errors.path}
                        onBlur={handleOnBlur}
                      />
                    );
                  case LVM_LOGICAL_VOLUME:
                    return (
                      <>
                        {sizeInputCombinedField()}
                        <Input
                          name="vgName"
                          value={values.vgName}
                          onChange={handleChange('vgName')}
                          label={`Volume Group Name*`}
                          error={touched.vgName && errors.vgName}
                          onBlur={handleOnBlur}
                        />
                      </>
                    );
                  default:
                    return;
                }
              };

              return (
                <Form>
                  <FormSection>
                    <RequiredText>
                      {intl.translate('required_fields')}
                    </RequiredText>
                  </FormSection>

                  <FormSection>
                    <Input
                      name="name"
                      value={values.name}
                      onChange={handleChange('name')}
                      label={`${intl.translate('name')}*`}
                      error={touched.name && errors.name}
                      onBlur={handleOnBlur}
                    />
                    {/* The node input will be prefilled if we create volume from node*/}
                    <Input
                      id="node_input"
                      label={`${intl.translate('node')}*`}
                      clearable={false}
                      type="select"
                      options={optionsNodes}
                      placeholder={intl.translate('select_a_node')}
                      noOptionsMessage={() => intl.translate('no_results')}
                      name="node"
                      onChange={handleSelectChange('node')}
                      value={getSelectedObjectItem(optionsNodes, values?.node)}
                      error={touched.node && errors.node}
                      onBlur={handleOnBlur}
                    />
                    <InputContainer className="sc-input">
                      <InputLabel className="sc-input-label">
                        {intl.translate('labels')}
                      </InputLabel>
                      <LabelsContainer>
                        <LabelsForm>
                          <Field
                            as={Input}
                            name="labelName"
                            placeholder={intl.translate('enter_label_name')}
                            value={values.labelName}
                            error={touched.labelName && errors.labelName}
                            onBlur={handleOnBlur}
                            onChange={handleChange('labelName')}
                            validate={validataLabelName}
                          />
                          <Input
                            name="labelValue"
                            placeholder={intl.translate('enter_label_value')}
                            value={values.labelValue}
                            error={touched.labelValue && errors.labelValue}
                            onBlur={handleOnBlur}
                            onChange={handleChange('labelValue')}
                          />
                          <Button
                            text={intl.translate('add')}
                            type="button"
                            onClick={addLabel}
                            data-cy="add-volume-labels-button"
                            variant={'buttonSecondary'}
                            disabled={
                              errors.labelValue ||
                              errors.labelName ||
                              !values.labelName // disable the Add button if no label key specified
                            }
                          />
                        </LabelsForm>
                        {!!Object.keys(values.labels).length && (
                          <LabelsList>
                            {Object.keys(values.labels).map((key, index) => (
                              <LabelsKeyValue key={`labelKeyValue_${index}`}>
                                <LabelsName>{key}</LabelsName>
                                <LabelsValue>{values.labels[key]}</LabelsValue>
                                <Button
                                  icon={<i className="fas fa-lg fa-trash" />}
                                  inverted={true}
                                  type="button"
                                  onClick={() => removeLabel(key)}
                                />
                              </LabelsKeyValue>
                            ))}
                          </LabelsList>
                        )}
                      </LabelsContainer>
                    </InputContainer>

                    <Input
                      id="storageClass_input"
                      label={`${intl.translate('storageClass')}*`}
                      clearable={false}
                      type="select"
                      options={optionsStorageClasses}
                      placeholder={intl.translate('select_a_storageClass')}
                      noOptionsMessage={() => intl.translate('no_results')}
                      name="storageClass"
                      onChange={handleSelectChange('storageClass')}
                      value={getSelectedObjectItem(
                        optionsStorageClasses,
                        values?.storageClass,
                      )}
                      error={touched.storageClass && errors.storageClass}
                      onBlur={handleOnBlur}
                    />
                    <Input
                      id="type_input"
                      label={`${intl.translate('volume_type')}*`}
                      clearable={false}
                      type="select"
                      options={optionsTypes}
                      placeholder={intl.translate('select_a_type')}
                      noOptionsMessage={() => intl.translate('no_results')}
                      name="type"
                      onChange={handleSelectChange('type')}
                      value={getSelectedObjectItem(optionsTypes, values?.type)}
                      error={touched.type && errors.type}
                      onBlur={handleOnBlur}
                    />
                    {renderVolumeTypeSpecificFields(values.type)}
                    <CheckboxContainer>
                      <Checkbox
                        name="multiVolumeCreation"
                        label={intl.translate('create_multiple_volumes')}
                        checked={values.multiVolumeCreation}
                        value={values.multiVolumeCreation}
                        onChange={handleCheckboxChange('multiVolumeCreation')}
                        onBlur={handleOnBlur}
                      />
                    </CheckboxContainer>
                  </FormSection>

                  {values.multiVolumeCreation && (
                    <MultiCreationFormContainer>
                      <FieldArray
                        name="volumes"
                        render={(arrayHelpers) => (
                          <div>
                            <div
                              style={{
                                paddingLeft: '60px',
                                paddingTop: `${padding.large}`,
                              }}
                            >
                              <span
                                style={{
                                  paddingRight: `${padding.base}`,
                                }}
                              >
                                {intl.translate('number_volume_create')}
                              </span>
                              <Input
                                type="number"
                                name="numberOfVolumes"
                                value={values.numberOfVolumes}
                                min="1"
                                // Max number of the batch volume creation is 70.
                                max={`${MAX_VOLUME_BATCH_CREATION}`}
                                onChange={setVolumeNumber(
                                  'numberOfVolumes',
                                  arrayHelpers,
                                )}
                                onBlur={handleOnBlur}
                                error={
                                  touched.numberOfVolumes &&
                                  errors.numberOfVolumes
                                }
                              />
                            </div>
                            <div
                              style={{
                                paddingLeft: '60px',
                                paddingTop: `${padding.large}`,
                              }}
                            >
                              {intl.translate(
                                'default_batch_volume_values_explanation',
                              )}
                            </div>
                            {values.numberOfVolumes <=
                              MAX_VOLUME_BATCH_CREATION &&
                              values.volumes.map((volume, index) => (
                                <SingleVolumeContainer key={`volume${index}`}>
                                  <div
                                    style={{ paddingTop: `${padding.small}` }}
                                  >
                                    {index + 1}-
                                  </div>
                                  <SingleVolumeForm>
                                    <RecommendField
                                      name={`volumes[${index}]name`}
                                      label={intl.translate('name')}
                                      onBlur={handleOnBlur}
                                      index={index}
                                      fieldname="name"
                                    />
                                    {values.type === RAW_BLOCK_DEVICE ? (
                                      <RecommendField
                                        name={`volumes.${index}.path`}
                                        label={intl.translate('device_path')}
                                        onBlur={handleOnBlur}
                                        index={index}
                                        fieldname="path"
                                      />
                                    ) : null}
                                  </SingleVolumeForm>
                                </SingleVolumeContainer>
                              ))}
                          </div>
                        )}
                      ></FieldArray>
                    </MultiCreationFormContainer>
                  )}
                  <ActionContainer>
                    <Button
                      text={intl.translate('cancel')}
                      type="button"
                      outlined
                      onClick={() => history.goBack()}
                    />
                    <Button
                      text={intl.translate('create')}
                      type="submit"
                      variant={'buttonPrimary'}
                      disabled={!dirty || !isEmpty(errors) || values.labelName}
                      data-cy="submit-create-volume"
                    />
                  </ActionContainer>
                </Form>
              );
            }}
          </Formik>
        </CreateVolumeLayout>
      </CreateVolumeFormContainer>
    </PageContainer>
  );
};

export default CreateVolume;
