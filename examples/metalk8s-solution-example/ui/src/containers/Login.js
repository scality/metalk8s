import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Formik, Form } from 'formik';
import * as yup from 'yup';
import { DebounceInput } from 'react-debounce-input';
import { Button } from '@scality/core-ui';
import {
  gray,
  warmRed,
  fontSize,
  padding
} from '@scality/core-ui/dist/style/theme';
import styled from 'styled-components';
import classnames from 'classnames';
import { authenticateAction } from '../ducks/login';
import { injectIntl } from 'react-intl';

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
  }

  input {
    padding: ${padding.small};
    font-size: ${fontSize.large};
    width: 250px;
    display: block;
    border-radius: 4px;
    border: 1px solid ${gray};
  }

  input:focus {
    border-color: #007eff;
    box-shadow: inset 0 1px 1px rgba(0, 0, 0, 0.075),
      0 0 0 3px rgba(0, 126, 255, 0.1);
    outline: none;
  }

  .error input {
    border-color: ${warmRed};
  }

  .label {
    font-weight: bold;
    display: block;
    margin-bottom: ${padding.smaller};
    margin-top: ${padding.large};
    color: white;
  }

  .input-feedback {
    color: ${warmRed};
    margin-top: ${padding.smaller};
    font-size: ${fontSize.small};
  }

  .input-group {
    margin-bottom: ${padding.large};
  }

  .animated {
    animation-duration: 1s;
    animation-fill-mode: both;
  }

  @keyframes shake {
    from,
    to {
      transform: translate3d(0, 0, 0);
    }

    10%,
    30%,
    50%,
    70%,
    90% {
      transform: translate3d(-10px, 0, 0);
    }

    20%,
    40%,
    60%,
    80% {
      transform: translate3d(10px, 0, 0);
    }
  }

  .shake {
    animation-name: shake;
  }
`;

const Error = styled.span`
  display: block;
  color: red;
`;

const LogoContainer = styled.div`
  position: absolute;
  top: 45px;
`;

const InputFeedback = ({ error }) =>
  error ? <div className="input-feedback">{error}</div> : null;

const Label = ({ error, className, children, ...props }) => {
  return (
    <label className="label" {...props}>
      {children}
    </label>
  );
};

const TextInput = ({
  type,
  id,
  label,
  error,
  value,
  onChange,
  className,
  ...props
}) => {
  const classes = classnames(
    'input-group',
    {
      'animated shake error': !!error
    },
    className
  );
  return (
    <div className={classes}>
      <Label htmlFor={id} error={error}>
        {label}
      </Label>
      <DebounceInput
        minLength={1}
        debounceTimeout={300}
        id={id}
        className="text-input"
        type={type}
        value={value}
        onChange={onChange ? onChange : null}
        {...props}
      />
      <InputFeedback error={error} />
    </div>
  );
};

const LoginForm = props => {
  const { values, touched, handleChange, isSubmitting, intl, errors } = props;
  return (
    <Form autoComplete="off">
      <LogoContainer>
        <img
          alt="logo"
          src={process.env.PUBLIC_URL + '/brand/assets/branding.svg'}
        />
      </LogoContainer>

      {errors.authentication && <Error>{errors.authentication}</Error>}
      <TextInput
        name="username"
        type="text"
        label={intl.messages.username}
        error={touched.username && errors.username}
        value={values.username}
        onChange={handleChange}
      />
      <TextInput
        name="password"
        type="password"
        label={intl.messages.password}
        error={touched.password && errors.password}
        value={values.password}
        onChange={handleChange}
      />
      <Button
        type="submit"
        text={intl.messages.submit}
        disabled={isSubmitting}
      />
    </Form>
  );
};

const initialValues = {
  username: '',
  password: ''
};

const validationSchema = yup.object().shape({
  username: yup.string().required(),
  password: yup.string().required()
});

const Login = loginProps => {
  const errors = useSelector(state => state.login.errors);
  const dispatch = useDispatch();
  const authenticate = values => dispatch(authenticateAction(values));
  return (
    <LoginFormContainer>
      <Formik
        initialValues={initialValues}
        validationSchema={validationSchema}
        validateOnBlur={false}
        validateOnChange={false}
        onSubmit={authenticate}
        render={props => {
          const formikProps = {
            ...props,
            ...loginProps,
            errors: { ...props.errors, ...errors }
          };
          return <LoginForm {...formikProps} />;
        }}
      />
    </LoginFormContainer>
  );
};

export default injectIntl(Login);
