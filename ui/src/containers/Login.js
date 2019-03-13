import React from 'react';
import { connect } from 'react-redux';
import { withFormik } from 'formik';
import * as Yup from 'yup';
import { DebounceInput } from 'react-debounce-input';
import { Button } from 'core-ui';
import styled from 'styled-components';
import loginImage from '../assets/scality-login.jpg';
import classnames from 'classnames';
import { autheticateAction } from '../ducks/login';

const LoginFormContainer = styled.div`
  height: 100vh;
  background: url(${loginImage});

  form {
    width: 350px;
    padding: 50px;
  }

  input {
    padding: 0.5rem;
    font-size: 16px;
    width: 100%;
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

  input.error {
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

const formikEnhancer = withFormik({
  validationSchema: Yup.object().shape({
    username: Yup.string().required('Required'),
    password: Yup.string().required('Required')
  }),

  mapPropsToValues: ({ login }) => ({
    ...login
  }),
  handleSubmit: (values, { props, setSubmitting }) => {
    props.authenticate(values);
    setSubmitting(false);
  },
  displayName: 'LoginForm'
});

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
        onChange={onChange}
        {...props}
      />
      <InputFeedback error={error} />
    </div>
  );
};

const LoginForm = props => {
  const {
    values,
    touched,
    errors,
    handleChange,
    handleSubmit,
    isSubmitting
  } = props;
  return (
    <form onSubmit={handleSubmit}>
      <TextInput
        name="username"
        type="username"
        label="Username"
        error={touched.username && errors.username}
        value={values.username}
        onChange={handleChange}
      />
      <TextInput
        name="password"
        type="password"
        label="Password"
        error={touched.password && errors.password}
        value={values.password}
        onChange={handleChange}
      />
      <Button type="submit" text="Submit" disabled={isSubmitting} />
    </form>
  );
};

const EnhancedLoginForm = formikEnhancer(LoginForm);

class Login extends React.Component {
  render() {
    return (
      <LoginFormContainer>
        <EnhancedLoginForm
          login={{ username: '', passord: '' }}
          authenticate={this.props.authenticate}
        />
      </LoginFormContainer>
    );
  }
}

const mapStateToProps = state => ({
  login: state.login
});

const mapDispatchToProps = dispatch => {
  return {
    authenticate: values => dispatch(autheticateAction(values))
  };
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(Login);
