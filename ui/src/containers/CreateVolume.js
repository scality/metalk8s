import React, { useEffect } from 'react';
import { connect } from 'react-redux';
import { Formik, Form } from 'formik';
import styled from 'styled-components';
import { Input, Button } from '@scality/core-ui';
import {
  fetchStorageClassAction,
  createVolumeAction
} from '../ducks/app/volumes';

const FormContainer = styled.div`
  display: flex;
  flex-direction: column;
`;

const ActionContainer = styled.div`
  margin-top: 10px;
`;

const CreateVolume = props => {
  let nodeName = props.match.params.id;

  useEffect(() => {
    props.fetchStorageClass();
  }, []);

  const storageClassesName = props.storageClass.map(
    storageClass => storageClass.metadata.name
  );

  // Hardcoded
  const types = [
    { label: 'RawBlockDevice', value: 'rawBlockDevice' },
    { label: 'SparseLoopDevice', value: 'sparseLoopDevice' }
  ];

  const initialValues = {
    name: '',
    storageClass: storageClassesName[0],
    type: types[0].value,
    size: '',
    path: ''
  };

  const isFormReady = storageClassesName.length > 0 && types.length > 0;

  return isFormReady ? (
    <div>
      <Formik
        initialValues={initialValues}
        onSubmit={values => {
          props.createVolume(values, nodeName);
        }}
      >
        {props => {
          const { values, handleChange } = props;
          return (
            <Form>
              <FormContainer>
                <Input
                  name="name"
                  value={values.name}
                  onChange={handleChange}
                  label="Name"
                />
                <div>
                  <select
                    name="storageClass"
                    onChange={handleChange}
                    value={values.storageClass}
                  >
                    {storageClassesName.map((SCName, idx) => (
                      <option key={`storageClass_${idx}`} value={SCName}>
                        {SCName}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <select name="type" onChange={handleChange}>
                    {types.map((type, idx) => (
                      <option key={`type_${idx}`} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>
                {values.type === 'sparseLoopDevice' ? (
                  <Input
                    name="size"
                    value={values.size}
                    onChange={handleChange}
                    label="Size"
                  />
                ) : (
                  <Input
                    name="path"
                    value={values.path}
                    onChange={handleChange}
                    label="Path"
                  />
                )}
                <ActionContainer>
                  <Button text="submit" type="submit" />
                </ActionContainer>
              </FormContainer>
            </Form>
          );
        }}
      </Formik>
    </div>
  ) : null;
};

const mapStateToProps = state => ({
  storageClass: state.app.volumes.storageClass
});

const mapDispatchToProps = dispatch => {
  return {
    fetchStorageClass: () => dispatch(fetchStorageClassAction()),
    createVolume: (body, nodeName) =>
      dispatch(createVolumeAction(body, nodeName))
  };
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(CreateVolume);
