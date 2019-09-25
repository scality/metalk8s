import React from 'react';
import { connect } from 'react-redux';
import styled from 'styled-components';
import { Formik, Form } from 'formik';
import * as Yup from 'yup';
import { withRouter } from 'react-router-dom';
import { injectIntl } from 'react-intl';
import { Button, Input, Breadcrumb } from '@scality/core-ui';
import { padding } from '@scality/core-ui/dist/style/theme';
import { isEmpty } from 'lodash';
import semver from 'semver';

import { createClockServerAction } from '../ducks/app/clockServer';
import {
  BreadcrumbContainer,
  BreadcrumbLabel,
  StyledLink
} from '../components/BreadcrumbStyle';

const CreateClockServerContainter = styled.div`
  height: 100%;
  padding: ${padding.base};
  display: inline-block;
`;

const CreateClockServerLayout = styled.div`
  height: 100%;
  overflow: auto;
  display: inline-block;
  margin-top: ${padding.base};
  form {
    .sc-input {
      margin: ${padding.smaller} 0;
      .sc-input-label,
      .sc-input-type,
      .sc-select {
        width: 150px;
        box-sizing: border-box;
      }
    }
  }
`;

const ActionContainer = styled.div`
  display: flex;
  margin: ${padding.large} 0;
  justify-content: flex-end;

  button {
    margin-left: ${padding.large};
  }
`;

const FormSection = styled.div`
  padding: 0 ${padding.larger};
  display: flex;
  flex-direction: column;
`;

const ClockServerCreationForm = props => {
  const { intl, match, theme } = props;
  const stack = match.params.name;
  const initialValues = {
    version: '',
    timezone: '',
    name: '',
    stack
  };

  const validationSchema = Yup.object().shape({
    version: Yup.string()
      .required()
      .test('is-version-valid', intl.messages.not_valid_version, value =>
        semver.valid(value)
      ),
    timezone: Yup.string().required(),
    name: Yup.string().required()
  });

  return (
    <CreateClockServerContainter>
      <BreadcrumbContainer>
        <Breadcrumb
          activeColor={theme.brand.secondary}
          paths={[
            <StyledLink to="/stacks">{intl.messages.stacks} </StyledLink>,
            <StyledLink to={`/stacks/${stack}`}>{stack}</StyledLink>,
            <BreadcrumbLabel title={intl.messages.create_clock_server}>
              {intl.messages.create_clock_server}
            </BreadcrumbLabel>
          ]}
        />
      </BreadcrumbContainer>
      <CreateClockServerLayout>
        <Formik
          initialValues={initialValues}
          validationSchema={validationSchema}
          onSubmit={props.createClockServer}
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
                <FormSection>
                  <Input
                    name="name"
                    label={intl.messages.name}
                    value={values.name}
                    onChange={handleChange('name')}
                    error={touched.name && errors.name}
                    onBlur={handleOnBlur}
                  />
                  <Input
                    name="version"
                    label={intl.messages.version}
                    value={values.version}
                    onChange={handleChange('version')}
                    error={touched.version && errors.version}
                    onBlur={handleOnBlur}
                  />

                  <Input
                    name="timezone"
                    label={intl.messages.timezone}
                    value={values.timezone}
                    onChange={handleChange('timezone')}
                    error={touched.timezone && errors.timezone}
                    onBlur={handleOnBlur}
                  />

                  <ActionContainer>
                    <div>
                      <div>
                        <Button
                          text={intl.messages.cancel}
                          type="button"
                          outlined
                          onClick={() =>
                            props.history.push(`/stacks/${match.params.name}`)
                          }
                        />
                        <Button
                          text={intl.messages.create}
                          type="submit"
                          disabled={!dirty || !isEmpty(errors)}
                        />
                      </div>
                    </div>
                  </ActionContainer>
                </FormSection>
              </Form>
            );
          }}
        </Formik>
      </CreateClockServerLayout>
    </CreateClockServerContainter>
  );
};

function mapStateToProps(state) {
  return {
    theme: state.config.theme
  };
}

const mapDispatchToProps = dispatch => {
  return {
    createClockServer: body => dispatch(createClockServerAction(body))
  };
};

export default injectIntl(
  withRouter(
    connect(
      mapStateToProps,
      mapDispatchToProps
    )(ClockServerCreationForm)
  )
);
