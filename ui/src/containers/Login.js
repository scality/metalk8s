import React from 'react';
import { connect } from 'react-redux';
import { Formik, Form } from 'formik';
import * as Yup from 'yup';
import { DebounceInput } from 'react-debounce-input';
import { Button } from 'core-ui';
import styled from 'styled-components';
import loginImage from '../assets/tech.jpg';
import classnames from 'classnames';
import { autheticateAction } from '../ducks/login';
import { injectIntl } from 'react-intl';
import Logo from '../assets/branding';

const LoginFormContainer = styled.div`
  height: 100vh;
  background: url(${loginImage});
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
    padding: 10px;
    font-size: 16px;
    width: 250px;
    display: block;
    border-radius: 4px;
    border: 1px solid #ccc;
  }

  input:focus {
    border-color: #007eff;
    box-shadow: inset 0 1px 1px rgba(0, 0, 0, 0.075),
      0 0 0 3px rgba(0, 126, 255, 0.1);
    outline: none;
  }

  .error input {
    border-color: red;
  }

  .label {
    font-weight: bold;
    display: block;
    margin-bottom: 5px;
    margin-top: 20px;
    color: white;
  }

  .input-feedback {
    color: red;
    margin-top: 5px;
    font-size: 12px;
  }

  .input-group {
    margin-bottom: 20px;
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
  const { values, touched, errors, handleChange, isSubmitting, intl } = props;
  return (
    <Form autoComplete="off">
      <LogoContainer>
        <Logo />
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
          validateOnBlur={false}
          validateOnChange={false}
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
    authenticate: values => dispatch(autheticateAction(values))
  };
};

export default injectIntl(
  connect(
    mapStateToProps,
    mapDispatchToProps
  )(Login)
);
