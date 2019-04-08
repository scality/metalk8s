import React from 'react';
import { connect } from 'react-redux';
import { DebounceInput } from 'react-debounce-input';
import classnames from 'classnames';
import styled from 'styled-components';
import { Formik, Form } from 'formik';
import { Button } from 'core-ui';
import { gray, fontSize, padding } from 'core-ui/dist/style/theme';
import * as Yup from 'yup';
import { createNodeAction } from '../ducks/app/nodes';

const CreateNodeFormContainer = styled.div`
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
    <CreateNodeFormContainer className={classes}>
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
    </CreateNodeFormContainer>
  );
};

const initialValues = {
  name: '',
  ssh_user: '',
  hostName_ip: '',
  ssh_port: '',
  ssh_key_path: '',
  sudo_required: false,
  workload_plane: true,
  control_plane: false
};

const validationSchema = Yup.object().shape({
  name: Yup.string().required(),
  ssh_user: Yup.string().required(),
  hostName_ip: Yup.string().required(),
  ssh_port: Yup.string().required(),
  ssh_key_path: Yup.string().required(),
  sudo_required: Yup.boolean().required()
});

class CreateNodeForm extends React.Component {
  constructor() {
    super();

    this.createNode = this.createNode.bind(this);
  }
  createNode(values, { setSubmitting }) {
    this.props.createNode(values);
  }

  render() {
    return (
      <div>
        <h2>Create a New Node</h2>
        <Formik
          initialValues={initialValues}
          validationSchema={validationSchema}
          validateOnBlur={false}
          validateOnChange={false}
          onSubmit={this.createNode}
        >
          {props => {
            const {
              values,
              // touched,
              // errors,
              handleChange,
              isSubmitting
              // intl
            } = props;
            return (
              <Form>
                <TextInput
                  name="name"
                  label={'Name'}
                  value={values.name}
                  onChange={handleChange}
                />
                <TextInput
                  name="ssh_user"
                  label={'SSH User'}
                  value={values.ssh_user}
                  onChange={handleChange}
                />
                <TextInput
                  name="hostName_ip"
                  label={'Hostname or IP'}
                  value={values.hostName_ip}
                  onChange={handleChange}
                />
                <TextInput
                  name="ssh_port"
                  label={'SSH Port'}
                  value={values.ssh_port}
                  onChange={handleChange}
                />
                <TextInput
                  name="ssh_key_path"
                  label={'SSH Key Path'}
                  value={values.ssh_key_path}
                  onChange={handleChange}
                />
                <TextInput
                  name="sudo_required"
                  type="checkbox"
                  label={'Sudo required'}
                  value={values.sudo_required}
                  onChange={handleChange}
                />
                <TextInput
                  name="workload_plane"
                  label={'Workload Plane'}
                  type="checkbox"
                  checked={true}
                  disabled
                  onChange={handleChange}
                />
                <TextInput
                  name="controle_plane"
                  type="checkbox"
                  label={'Control Plane'}
                  value={values.control_plane}
                  onChange={handleChange}
                />
                <Button text="Create" type="submit" />
              </Form>
            );
          }}
        </Formik>
      </div>
    );
  }
}

const mapDispatchToProps = dispatch => {
  return {
    createNode: body => dispatch(createNodeAction(body))
  };
};

export default connect(
  null,
  mapDispatchToProps
)(CreateNodeForm);
