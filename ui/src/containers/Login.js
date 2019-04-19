import React from 'react';
import { connect } from 'react-redux';
import { Formik, Form } from 'formik';
import * as Yup from 'yup';
import { Button, Input } from 'core-ui';
import { brand, padding } from 'core-ui/dist/style/theme';
import styled from 'styled-components';
import { authenticateAction } from '../ducks/login';
import { injectIntl } from 'react-intl';
import { isEmpty } from 'lodash';

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

const LoginForm = props => {
  const {
    values,
    touched,
    errors,
    dirty,
    intl,
    setFieldValue,
    setFieldTouched
  } = props;
  //handleChange of the Formik props does not update 'values' when field value is empty
  const handleChange = (e, field) => {
    const { value, checked, type } = e.target;
    setFieldValue(field, type === 'checkbox' ? checked : value, true);
  };
  //touched is not "always" correctly set
  const handleOnBlur = e => setFieldTouched(e.target.name, true);

  return (
    <Form autoComplete="off">
      <LogoContainer>
        <img
          alt="logo"
          src={process.env.PUBLIC_URL + '/brand/assets/branding.svg'}
        />
      </LogoContainer>

      {errors.authentication && <Error>{errors.authentication}</Error>}
      <Input
        name="username"
        type="text"
        label={intl.messages.username}
        error={touched.username && errors.username}
        value={values.username}
        onChange={e => handleChange(e, 'username')}
        onBlur={handleOnBlur}
      />
      <Input
        name="password"
        type="password"
        label={intl.messages.password}
        error={touched.password && errors.password}
        value={values.password}
        onChange={e => handleChange(e, 'password')}
        onBlur={handleOnBlur}
      />
      <Button
        type="submit"
        text={intl.messages.submit}
        disabled={!dirty || !isEmpty(errors)}
      />
    </Form>
  );
};

const initialValues = {
  username: '',
  password: ''
};

const validationSchema = Yup.object().shape({
  username: Yup.string().required(),
  password: Yup.string().required()
});

class Login extends React.Component {
  render() {
    return (
      <LoginFormContainer>
        <Formik
          initialValues={initialValues}
          validationSchema={validationSchema}
          onSubmit={this.props.authenticate}
          render={props => {
            const formikProps = {
              ...props,
              ...this.props,
              errors: { ...props.errors, ...this.props.errors }
            };
            return <LoginForm {...formikProps} />;
          }}
        />
      </LoginFormContainer>
    );
  }
}

const mapStateToProps = state => ({
  errors: state.login.errors
});

const mapDispatchToProps = dispatch => {
  return {
    authenticate: values => dispatch(authenticateAction(values))
  };
};

export default injectIntl(
  connect(
    mapStateToProps,
    mapDispatchToProps
  )(Login)
);
