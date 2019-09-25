import React, { useState, useEffect } from 'react';
import { connect } from 'react-redux';
import { injectIntl } from 'react-intl';
import styled from 'styled-components';
import { withRouter } from 'react-router-dom';
import { Breadcrumb, Button, Input } from '@scality/core-ui';
import { padding } from '@scality/core-ui/dist/style/theme';
import { Formik, Form } from 'formik';
import semver from 'semver';
import * as Yup from 'yup';
import { isEmpty } from 'lodash';

import {
  BreadcrumbContainer,
  BreadcrumbLabel,
  StyledLink
} from '../components/BreadcrumbStyle';
import {
  InformationListContainer,
  InformationSpan,
  InformationLabel,
  InformationValue,
  InformationMainValue
} from '../components/InformationList';
import ComponentsList from './Component';
import { editStackAction, prepareStackAction } from '../ducks/app/stack';

const StackDetailContainer = styled.div`
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  height: 100%;
  padding: ${padding.base};
`;

const ComponentContainer = styled.div`
  padding: 0 ${padding.larger};
`;

const EditIcon = styled.span`
padding: 0 ${padding.base}
  color: ${props => props.theme.brand.primary};
  &:hover {
    color: ${props => props.theme.brand.secondary};
    cursor: pointer;
  }
`;

const StackEditFormContainer = styled.div`
  display: inline-block;
  .sc-button,
  .sc-input {
    margin-right: ${padding.smaller};
  }
`;

const StackEditForm = props => {
  const { intl, currentVersion, onCancel, onSubmit } = props;
  const initialValues = {
    version: currentVersion
  };

  const validationSchema = Yup.object().shape({
    version: Yup.string()
      .required()
      .test('is-version-valid', intl.messages.not_valid_version, value =>
        semver.valid(value)
      )
  });

  return (
    <StackEditFormContainer>
      <Formik
        initialValues={initialValues}
        validationSchema={validationSchema}
        onSubmit={onSubmit}
      >
        {formProps => {
          const {
            values,
            touched,
            errors,
            dirty,
            setFieldTouched,
            setFieldValue
          } = formProps;

          //handleChange of the Formik props does not update 'values' when field value is empty
          const handleChange = field => e => {
            const { value, checked, type } = e.target;
            setFieldValue(field, type === 'checkbox' ? checked : value, true);
          };

          //touched is not "always" correctly set
          const handleOnBlur = e => setFieldTouched(e.target.name, true);

          return (
            <Form>
              <Input
                name="version"
                label=""
                value={values.version}
                onChange={handleChange('version')}
                error={touched.version && errors.version}
                onBlur={handleOnBlur}
              />

              <Button
                title={intl.messages.cancel}
                icon={<i className="fas fa-times"></i>}
                type="button"
                outlined
                onClick={onCancel}
              />
              <Button
                title={intl.messages.edit}
                icon={<i className="fas fa-check"></i>}
                type="submit"
                disabled={!dirty || !isEmpty(errors)}
              />
            </Form>
          );
        }}
      </Formik>
    </StackEditFormContainer>
  );
};
const StackDetail = props => {
  const { match, intl, theme, stacks, editStack, prepareStack } = props;
  const [stackEditing, setStackEditing] = useState(false);
  const stackName = match.params.name;
  const stackVersion = match.params.version;
  const stack = stacks.find(stack => stack.name === stackName);

  useEffect(() => {
    prepareStack({ name: stackName, version: stackVersion });
  }, []);

  return stack ? (
    <StackDetailContainer>
      <BreadcrumbContainer>
        <Breadcrumb
          activeColor={theme.brand.secondary}
          paths={[
            <StyledLink to="/stacks">{intl.messages.stacks} </StyledLink>,
            <BreadcrumbLabel title={stack.name}>{stack.name}</BreadcrumbLabel>
          ]}
        />
      </BreadcrumbContainer>
      <InformationListContainer>
        <h3>{intl.messages.information}</h3>
        <InformationSpan>
          <InformationLabel>{intl.messages.name}</InformationLabel>
          <InformationMainValue>{stack.name}</InformationMainValue>
        </InformationSpan>
        <InformationSpan>
          <InformationLabel>{intl.messages.status}</InformationLabel>
          <InformationValue>
            {intl.messages[stack.status] || stack.status}
          </InformationValue>
        </InformationSpan>
        <InformationSpan>
          <InformationLabel>{intl.messages.version}</InformationLabel>
          <InformationValue>
            {stackEditing ? (
              <StackEditForm
                intl={intl}
                onCancel={() => setStackEditing(false)}
                onSubmit={editStack}
                currentVersion={stack.version}
              />
            ) : (
              <InformationValue>
                {stack.version}
                <EditIcon
                  title={intl.messages.edit_stack_version}
                  onClick={() => setStackEditing(true)}
                >
                  <i className="fas fa-edit"></i>
                </EditIcon>
              </InformationValue>
            )}
          </InformationValue>
        </InformationSpan>
        <InformationSpan>
          <InformationLabel>{intl.messages.description}</InformationLabel>
          <InformationValue>{stack.description}</InformationValue>
        </InformationSpan>
      </InformationListContainer>
      <ComponentContainer>
        <h3>{intl.messages.components}</h3>
        <ComponentsList />
      </ComponentContainer>
    </StackDetailContainer>
  ) : null;
};

const mapStateToProps = state => ({
  theme: state.config.theme,
  stacks: state.app.stack.list
});

const mapDispatchToProps = dispatch => {
  return {
    prepareStack: body => dispatch(prepareStackAction(body)),
    editStack: body => dispatch(editStackAction(body))
  };
};

export default injectIntl(
  withRouter(
    connect(
      mapStateToProps,
      mapDispatchToProps
    )(StackDetail)
  )
);
