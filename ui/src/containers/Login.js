import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Formik, Form } from 'formik';
import * as yup from 'yup';
import { Input } from '@scality/core-ui';
import { Button } from '@scality/core-ui/dist/next';
import { brand, padding } from '@scality/core-ui/dist/style/theme';
import styled from 'styled-components';
import { authenticateAction } from '../ducks/login';
import { injectIntl } from 'react-intl';
import isEmpty from 'lodash.isempty';

const LoginFormContainer = styled.div`
  height: 100vh;
  background: url(${process.env.PUBLIC_URL + '/brand/assets/login.jpg'});
  background-size: cover;
  position: relative;

  form {
    padding: 200px 50px;
    position: absolute;
    background-color: rgba(70, 103, 127, 0.8);
    top: 0;
    bottom: 0;

    .sc-input {
      display: block;
      margin: 30px 0;

      .sc-input-label {
        padding: 0;
        font-weight: bold;
        display: block;
        margin-bottom: ${padding.smaller};
        margin-top: ${padding.larger};
        color: white;
      }
    }
  }
`;

const Error = styled.span`
  display: block;
  color: ${brand.danger};
`;

const LogoContainer = styled.div`
  position: absolute;
  top: 45px;
`;

const LoginForm = (props) => {
  const {
    values,
    touched,
    errors,
    dirty,
    intl,
    setFieldValue,
    setFieldTouched,
    asyncErrors,
  } = props;
  //handleChange of the Formik props does not update 'values' when field value is empty
  const handleChange = (field) => (e) => {
    const { value, checked, type } = e.target;
    setFieldValue(field, type === 'checkbox' ? checked : value, true);
  };
  //touched is not "always" correctly set
  const handleOnBlur = (e) => setFieldTouched(e.target.name, true);

  return (
    <Form autoComplete="off">
      <LogoContainer>
        <img
          alt="logo"
          src={process.env.PUBLIC_URL + '/brand/assets/branding-dark.svg'}
        />
      </LogoContainer>
      <Input
        name="username"
        type="text"
        label={intl.messages.username}
        error={touched.username && errors.username}
        value={values.username}
        onChange={handleChange('username')}
        onBlur={handleOnBlur}
      />
      <Input
        name="password"
        type="password"
        label={intl.messages.password}
        error={touched.password && errors.password}
        value={values.password}
        onChange={handleChange('password')}
        onBlur={handleOnBlur}
      />
      <Button
        type="submit"
        variant="primary"
        label={intl.messages.submit}
        disabled={!dirty || !isEmpty(errors)}
      />
      {asyncErrors && asyncErrors.authentication && (
        <Error>{asyncErrors.authentication}</Error>
      )}
    </Form>
  );
};

const initialValues = {
  username: '',
  password: '',
};

const validationSchema = yup.object().shape({
  username: yup.string().required(),
  password: yup.string().required(),
});

const Login = (props) => {
  const asyncErrors = useSelector((state) => state.login.errors);
  const dispatch = useDispatch();
  const authenticate = (values) => dispatch(authenticateAction(values));

  return (
    <LoginFormContainer>
      <Formik
        initialValues={initialValues}
        validationSchema={validationSchema}
        onSubmit={authenticate}
        render={(renderProps) => {
          const formikProps = {
            ...renderProps,
            ...props,
            asyncErrors: asyncErrors,
          };
          return <LoginForm {...formikProps} />;
        }}
      />
    </LoginFormContainer>
  );
};

export default injectIntl(Login);
