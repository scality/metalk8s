import React, { useEffect } from 'react';
import { connect } from 'react-redux';
import { Formik, Form } from 'formik';
import { injectIntl } from 'react-intl';
import styled from 'styled-components';
import { Link } from 'react-router-dom';
import { Input, Button, Breadcrumb } from '@scality/core-ui';
import {
  fetchStorageClassAction,
  createVolumeAction
} from '../ducks/app/volumes';
import { fontSize, padding } from '@scality/core-ui/dist/style/theme';
import { SPARCE_LOOP_DEVICE, RAW_BLOCK_DEVICE } from '../constants';

// We might want to do a factorization later for
// form styled components
const CreateVolumeContainer = styled.div`
  height: 100%;
  overflow: auto;
  padding: ${padding.base};
  display: inline-block;
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
    margin-right: ${padding.large};
  }
`;

const CreateVolumeLayout = styled.div`
  height: 100%;
  overflow: auto;
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

const SelectField = styled.div`
  display: inline-flex;
  align-items: center;
`;

const SelectFieldItem = styled.select`
  flex-grow: 1;
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

const CreateVolume = props => {
  const { theme, intl, match, history } = props;
  useEffect(() => {
    props.fetchStorageClass();
  }, []);

  const nodeName = props.match.params.id;
  const storageClassesName = props.storageClass.map(
    storageClass => storageClass.metadata.name
  );
  // Hardcoded
  const types = [
    { label: 'RawBlockDevice', value: RAW_BLOCK_DEVICE },
    { label: 'SparseLoopDevice', value: SPARCE_LOOP_DEVICE }
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
    <CreateVolumeContainer>
      <BreadcrumbContainer>
        <Breadcrumb
          activeColor={theme.brand.secondary}
          paths={[
            <StyledLink to="/nodes">{intl.messages.nodes}</StyledLink>,
            <StyledLink to={`/nodes/${match.params.id}`}>
              {match.params.id}
            </StyledLink>,
            <BreadcrumbLabel>Create New Volume</BreadcrumbLabel>
          ]}
        />
      </BreadcrumbContainer>
      <CreateVolumeLayout>
        <Formik
          initialValues={initialValues}
          onSubmit={values => {
            props.createVolume(values, nodeName);
          }}
        >
          {formikProps => {
            const { values, handleChange } = formikProps;
            return (
              <Form>
                <FormSection>
                  <Input
                    name="name"
                    value={values.name}
                    onChange={handleChange}
                    label={intl.messages.name}
                  />
                  <SelectField>
                    <SelectLabel>{intl.messages.storageClass}</SelectLabel>
                    <SelectFieldItem
                      name="storageClass"
                      onChange={handleChange}
                      value={values.storageClass}
                    >
                      {storageClassesName.map((SCName, idx) => (
                        <option key={`storageClass_${idx}`} value={SCName}>
                          {SCName}
                        </option>
                      ))}
                    </SelectFieldItem>
                  </SelectField>
                  <SelectField>
                    <SelectLabel>{intl.messages.type}</SelectLabel>
                    <SelectFieldItem name="type" onChange={handleChange}>
                      {types.map((type, idx) => (
                        <option key={`type_${idx}`} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </SelectFieldItem>
                  </SelectField>

                  {values.type === SPARCE_LOOP_DEVICE ? (
                    <Input
                      name="size"
                      value={values.size}
                      onChange={handleChange}
                      label={intl.messages.volume_size}
                    />
                  ) : (
                    <Input
                      name="path"
                      value={values.path}
                      onChange={handleChange}
                      label={intl.messages.device_path}
                    />
                  )}
                </FormSection>
                <ActionContainer>
                  <Button
                    text={intl.messages.cancel}
                    type="button"
                    outlined
                    onClick={() => history.push(`/nodes/${match.params.id}`)}
                  />
                  <Button text={intl.messages.create} type="submit" />
                </ActionContainer>
              </Form>
            );
          }}
        </Formik>
      </CreateVolumeLayout>
    </CreateVolumeContainer>
  ) : null;
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
