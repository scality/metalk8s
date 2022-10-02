import React, { Fragment, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useHistory } from 'react-router';
import { Formik, FieldArray, useFormikContext, useField, Field } from 'formik';
import * as yup from 'yup';
import styled from 'styled-components';
import {
  Banner,
  Checkbox,
  Loader,
  Form,
  FormSection,
  FormGroup,
  Stack,
  Toggle,
  Text,
} from '@scality/core-ui';
import { Button, Input as InputV2, Select } from '@scality/core-ui/dist/next';
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
import { useIntl } from 'react-intl';
import { convertRemToPixels } from '@scality/core-ui/dist/components/tablev2/TableUtils';

const MAX_VOLUME_BATCH_CREATION = 70;

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

const CreateVolume = (props) => {
  const dispatch = useDispatch();
  const history = useHistory();
  const intl = useIntl();
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
    forceLVCreate: false,
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
    const { fieldname, name, index, label, id } = props;
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
      <FormGroup
        label={label}
        id={id}
        error={!!meta.touched && !!meta.error ? meta.error : ''}
        content={<InputV2 {...props} {...field} />}
      />
    );
  };

  const volumeNameRegex =
    /^[a-z0-9]([-a-z0-9]*[a-z0-9])?(\.[a-z0-9]([-a-z0-9]*[a-z0-9])?)*$/;
  /* Valid label keys have two segments: an optional prefix and name, separated by a slash (/).
    https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/#syntax-and-character-set  */
  const labelFullNameRegex =
    /^([a-z0-9]([-a-z0-9]*[a-z0-9])?(\.[a-z0-9]([-a-z0-9]*[a-z0-9])?)*\/)?(([A-Za-z0-9][-A-Za-z0-9_.]*)?[A-Za-z0-9])$/;
  const labelNamePrefixRegex =
    /^[a-z0-9]([-a-z0-9]*[a-z0-9])?(\.[a-z0-9]([-a-z0-9]*[a-z0-9])?)*$/;
  const labelValueRegex = /^(([A-Za-z0-9][-A-Za-z0-9_.]*)?[A-Za-z0-9])?$/;
  const positiveIntegerRegex = /^[1-9][0-9]*$/;

  const validationSchema = yup.object().shape({
    name: yup
      .string()
      .matches(volumeNameRegex, intl.formatMessage({ id: 'name_error' }))
      .required(
        intl.formatMessage(
          { id: 'generic_missing_field' },
          {
            field: intl.formatMessage({ id: 'name' }).toLowerCase(),
          },
        ),
      ),
    node: yup.string().required(),
    storageClass: yup.string().required(),
    type: yup.string().required(),
    path: yup
      .string()
      .matches(/^\//, intl.formatMessage({ id: 'volume_path_error' }))
      .when('type', {
        is: RAW_BLOCK_DEVICE,
        then: yup.string().required(
          intl.formatMessage(
            { id: 'generic_missing_field' },
            {
              field: intl.formatMessage({ id: 'device_path' }).toLowerCase(),
            },
          ),
        ),
      }),
    sizeInput: yup.string().when('type', {
      is: SPARSE_LOOP_DEVICE,
      then: yup
        .string()
        .matches(
          positiveIntegerRegex,
          intl.formatMessage({ id: 'volume_size_error' }),
        )
        .required(
          intl.formatMessage(
            { id: 'generic_missing_field' },
            {
              field: intl.formatMessage({ id: 'volume_size' }).toLowerCase(),
            },
          ),
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
        .matches(volumeNameRegex, intl.formatMessage({ id: 'name_error' }))
        .required(
          intl.formatMessage(
            { id: 'generic_missing_field' },
            {
              field: intl.formatMessage({ id: 'name_error' }).toLowerCase(),
            },
          ),
        ),
    }),
    forceLVCreate: yup.boolean(),
    labels: yup.object(),
    labelValue: yup
      .string()
      .matches(labelValueRegex, intl.formatMessage({ id: 'label_value_error' }))
      .max(63, intl.formatMessage({ id: 'n_character_or_less' }, { n: 63 })),
    numberOfVolumes: yup
      .number()
      .positive()
      .max(MAX_VOLUME_BATCH_CREATION)
      .integer(),
    volumes: yup.array().of(
      yup.object().shape({
        name: yup
          .string()
          .matches(volumeNameRegex, intl.formatMessage({ id: 'name_error' })),
      }),
    ),
  });

  const isStorageClassExist = storageClassesName.length > 0;

  return isStorageClassLoading ? (
    <Loader size="massive" centered={true} />
  ) : (
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
          handleSubmit,
        } = formikProps;

        //touched is not "always" correctly set
        const handleOnBlur = (e) => setFieldTouched(e.target.name, true);
        const handleSelectChange = (field) => (selectedObj) => {
          setFieldValue(field, selectedObj ? selectedObj : '');
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
              const isLabelPrefixMatched = labelNamePrefixRegex.test(prefix);
              error = intl.formatMessage(
                isLabelPrefixMatched
                  ? { id: 'label_name_error' }
                  : { id: 'label_prefix_name_error' },
              );
            } else {
              error = intl.formatMessage({ id: 'label_name_error' });
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
        const setVolumeNumber = (field, arrayHelpers) => (selectedObj) => {
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
            <FormGroup
              label={intl.formatMessage({ id: 'volume_size' })}
              required
              helpErrorPosition="bottom"
              error={
                (touched.sizeInput && errors.sizeInput) ||
                (touched.selectedUnit && errors.selectedUnit)
              }
              id="sizeInput"
              content={
                <Stack>
                  <InputV2
                    name="sizeInput"
                    id="sizeInput"
                    type="number"
                    size="2/3"
                    min="1"
                    value={values.sizeInput}
                    onChange={handleChange('sizeInput')}
                    onBlur={handleOnBlur}
                  />

                  <Select
                    id="selectedUnit"
                    name="selectedUnit"
                    size="1/3"
                    placeholder={intl.formatMessage({ id: 'select_a_node' })}
                    onChange={handleSelectChange('selectedUnit')}
                    value={values?.selectedUnit}
                    onBlur={handleOnBlur}
                  >
                    {optionsSizeUnits.map((size, i) => (
                      <Select.Option key={i} value={size.value}>
                        {size.label}
                      </Select.Option>
                    ))}
                  </Select>
                </Stack>
              }
            />
          );
        };

        // render the fields specifically for different volume types
        const renderVolumeTypeSpecificFields = (volumeType) => {
          switch (volumeType) {
            case SPARSE_LOOP_DEVICE:
              return sizeInputCombinedField();
            case RAW_BLOCK_DEVICE:
              return (
                <FormGroup
                  label={intl.formatMessage({ id: 'device_path' })}
                  required
                  labelHelpTooltip={intl.formatMessage({
                    id: 'device_path_explanation',
                  })}
                  helpErrorPosition="bottom"
                  error={touched.path && errors.path}
                  id="path"
                  content={
                    <InputV2
                      name="path"
                      id="path"
                      value={values.path}
                      onChange={handleChange('path')}
                      onBlur={handleOnBlur}
                    />
                  }
                />
              );
            case LVM_LOGICAL_VOLUME:
              return (
                <>
                  {sizeInputCombinedField()}
                  <FormGroup
                    label={intl.formatMessage({ id: 'vg_name' })}
                    required
                    helpErrorPosition="bottom"
                    error={touched.vgName && errors.vgName}
                    id="vgName"
                    content={
                      <InputV2
                        name="vgName"
                        id="vgName"
                        value={values.vgName}
                        onChange={handleChange('vgName')}
                        onBlur={handleOnBlur}
                      />
                    }
                  />

                  <FormGroup
                    label={intl.formatMessage({ id: 'force_lvcreate' })}
                    helpErrorPosition="bottom"
                    labelHelpTooltip={intl.formatMessage({
                      id: 'force_lvcreate_explanation',
                    })}
                    error={touched.forceLVCreate && errors.forceLVCreate}
                    id="forceLVCreate"
                    content={
                      <Toggle
                        id="forceLVCreate"
                        name="forceLVCreate"
                        toggle={values.forceLVCreate}
                        label={values.forceLVCreate ? 'Yes' : 'No'}
                        onChange={() => {
                          setFieldValue('forceLVCreate', !values.forceLVCreate);
                        }}
                      />
                    }
                  />
                </>
              );
            default:
              return;
          }
        };

        return (
          <Form
            onSubmit={handleSubmit}
            rightActions={
              <Stack>
                <Button
                  label={intl.formatMessage({ id: 'cancel' })}
                  type="button"
                  variant="outline"
                  onClick={() => history.goBack()}
                />
                <Button
                  label={intl.formatMessage({ id: 'create' })}
                  type="submit"
                  variant={'primary'}
                  disabled={!dirty || !isEmpty(errors) || values.labelName}
                  data-cy="submit-create-volume"
                />
              </Stack>
            }
            layout={{
              kind: 'page',
              title: intl.formatMessage({ id: 'create_volume' }),
            }}
            banner={
              isStorageClassExist ? null : (
                <Banner
                  variant="warning"
                  icon={<i className="fas fa-exclamation-triangle" />}
                  title={intl.formatMessage({ id: 'no_storage_class_found' })}
                >
                  {intl.formatMessage({ id: 'storage_class_is_required' })}
                  <a
                    rel="noopener noreferrer"
                    target="_blank"
                    href={`${api.url_doc}/operation/volume_management/storageclass_creation.html`}
                  >
                    {intl.formatMessage({ id: 'learn_more' })}
                  </a>
                </Banner>
              )
            }
          >
            <FormSection forceLabelWidth={convertRemToPixels(10)}>
              <FormGroup
                label={intl.formatMessage({ id: 'name' })}
                required
                helpErrorPosition="bottom"
                error={touched.name && errors.name}
                id="name"
                content={
                  <InputV2
                    name="name"
                    value={values.name}
                    onChange={handleChange('name')}
                    onBlur={handleOnBlur}
                  />
                }
              />

              {/* The node input will be prefilled if we create volume from node*/}
              <FormGroup
                label={intl.formatMessage({ id: 'node' })}
                required
                helpErrorPosition="bottom"
                error={touched.node && errors.node}
                id="node_input"
                content={
                  <Select
                    id="node_input"
                    name="node"
                    placeholder={intl.formatMessage({ id: 'select_a_node' })}
                    onChange={handleSelectChange('node')}
                    value={values?.node}
                    onBlur={handleOnBlur}
                  >
                    {optionsNodes.map((node, i) => (
                      <Select.Option key={i} value={node.value}>
                        {node.label}
                      </Select.Option>
                    ))}
                  </Select>
                }
              />

              <FormGroup
                label={intl.formatMessage({ id: 'labels' })}
                helpErrorPosition="bottom"
                error={
                  (touched.labelName && errors.labelName) ||
                  (touched.labelValue && errors.labelValue)
                }
                id="labelName"
                content={
                  <Stack direction="vertical">
                    <Stack>
                      <Field
                        as={InputV2}
                        name="labelName"
                        size="1/2"
                        id="labelName"
                        placeholder={intl.formatMessage({
                          id: 'enter_label_name',
                        })}
                        value={values.labelName}
                        onBlur={handleOnBlur}
                        onChange={handleChange('labelName')}
                        validate={validataLabelName}
                      />
                      <InputV2
                        name="labelValue"
                        size="1/2"
                        placeholder={intl.formatMessage({
                          id: 'enter_label_value',
                        })}
                        value={values.labelValue}
                        onBlur={handleOnBlur}
                        onChange={handleChange('labelValue')}
                      />
                      <Button
                        label={intl.formatMessage({ id: 'add' })}
                        type="button"
                        onClick={addLabel}
                        data-cy="add-volume-labels-button"
                        variant={'secondary'}
                        disabled={
                          errors.labelValue ||
                          errors.labelName ||
                          !values.labelName // disable the Add button if no label key specified
                        }
                      />
                    </Stack>
                    {!!Object.keys(values.labels).length && (
                      <LabelsList>
                        {Object.keys(values.labels).map((key, index) => (
                          <LabelsKeyValue key={`labelKeyValue_${index}`}>
                            <LabelsName>{key}</LabelsName>
                            <LabelsValue>{values.labels[key]}</LabelsValue>
                            <Button
                              icon={<i className="fas fa-lg fa-trash" />}
                              type="button"
                              onClick={() => removeLabel(key)}
                            />
                          </LabelsKeyValue>
                        ))}
                      </LabelsList>
                    )}
                  </Stack>
                }
              />

              <FormGroup
                label={intl.formatMessage({ id: 'storageClass' })}
                required
                helpErrorPosition="bottom"
                error={touched.storageClass && errors.storageClass}
                id="storageClass_input"
                content={
                  <Select
                    id="storageClass_input"
                    name="storageClass"
                    placeholder={intl.formatMessage({
                      id: 'select_a_storageClass',
                    })}
                    onChange={handleSelectChange('storageClass')}
                    value={values?.storageClass}
                    onBlur={handleOnBlur}
                  >
                    {optionsStorageClasses.map((sc, i) => (
                      <Select.Option key={i} value={sc.value}>
                        {sc.label}
                      </Select.Option>
                    ))}
                  </Select>
                }
              />

              <FormGroup
                label={intl.formatMessage({ id: 'volume_type' })}
                required
                helpErrorPosition="bottom"
                error={touched.type && errors.type}
                id="type_input"
                content={
                  <Select
                    id="type_input"
                    name="type"
                    placeholder={intl.formatMessage({
                      id: 'select_a_type',
                    })}
                    onChange={handleSelectChange('type')}
                    value={values?.type}
                    onBlur={handleOnBlur}
                  >
                    {optionsTypes.map((opt, i) => (
                      <Select.Option key={i} value={opt.value}>
                        {opt.label}
                      </Select.Option>
                    ))}
                  </Select>
                }
              />
              {renderVolumeTypeSpecificFields(values.type)}
              <CheckboxContainer>
                <Checkbox
                  name="multiVolumeCreation"
                  label={intl.formatMessage({
                    id: 'create_multiple_volumes',
                  })}
                  checked={values.multiVolumeCreation}
                  value={values.multiVolumeCreation}
                  onChange={handleCheckboxChange('multiVolumeCreation')}
                  onBlur={handleOnBlur}
                />
              </CheckboxContainer>
            </FormSection>
            <FormSection>
              {values.multiVolumeCreation && (
                <MultiCreationFormContainer>
                  <FieldArray
                    name="volumes"
                    render={(arrayHelpers) => (
                      <Stack direction="vertical" gap="f24">
                        <FormGroup
                          label={intl.formatMessage({
                            id: 'number_volume_create',
                          })}
                          id="numberOfVolumes"
                          content={
                            <InputV2
                              type="number"
                              name="numberOfVolumes"
                              id="numberOfVolumes"
                              size="1/3"
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
                          }
                        />

                        <Stack direction="vertical" gap='f16'>
                          <div>
                            <Text isGentleEmphazed>
                              {intl.formatMessage({
                                id: 'default_batch_volume_values_explanation',
                              })}
                            </Text>
                            <br />
                            <Text color="textSecondary" isGentleEmphazed>
                              {intl.formatMessage({
                                id: 'you_may_use_defaults',
                              })}
                            </Text>
                          </div>

                          {values.numberOfVolumes <=
                            MAX_VOLUME_BATCH_CREATION &&
                            values.volumes.map((volume, index) => (
                              <Stack key={`volume${index}`}>
                                <Text>{index + 1}- </Text>
                                <Stack direction='vertical'>
                                  <RecommendField
                                    name={`volumes[${index}]name`}
                                    label={`${intl.formatMessage({
                                      id: 'name',
                                    })}`}
                                    onBlur={handleOnBlur}
                                    id={'name' + `volume${index}`}
                                    index={index}
                                    fieldname="name"
                                  />
                                  {values.type === RAW_BLOCK_DEVICE ? (
                                    <RecommendField
                                      name={`volumes.${index}.path`}
                                      label={`${intl.formatMessage({
                                        id: 'device_path',
                                      })}`}
                                      id={'path' + `volume${index}`}
                                      onBlur={handleOnBlur}
                                      index={index}
                                      fieldname="path"
                                    />
                                  ) : null}
                                </Stack>
                              </Stack>
                            ))}
                        </Stack>
                      </Stack>
                    )}
                  ></FieldArray>
                </MultiCreationFormContainer>
              )}
            </FormSection>
          </Form>
        );
      }}
    </Formik>
  );
};

export default CreateVolume;
