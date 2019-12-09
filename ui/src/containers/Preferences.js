import React from 'react';
import { useSelector } from 'react-redux';
import styled from 'styled-components';
import { injectIntl } from 'react-intl';
import { useHistory } from 'react-router';

import { Input, Button, Breadcrumb } from '@scality/core-ui';
import { padding, fontSize } from '@scality/core-ui/dist/style/theme';
import {
  BreadcrumbContainer,
  BreadcrumbLabel,
} from '../components/BreadcrumbStyle';
import { Formik, Form } from 'formik';
import isEmpty from 'lodash.isempty';
import { LANGUAGE, THEME } from '../constants';

const PreferencesContainer = styled.div`
  display: inline-block;
  height: 100%;
  padding: ${padding.base};
`;

const SetPreferenceLayout = styled.div`
  display: inline-block;
  margin-top: ${padding.base};
  form {
    .sc-input {
      display: inline-flex;
      margin: ${padding.smaller} 0;
      .sc-input-label {
        width: 150px;
      }
    }
  }
  .sc-select-option-label,
  .sc-select__placeholder {
    font-size: ${fontSize.base};
  }
`;

const FormSection = styled.div`
  display: flex;
  padding: 0 ${padding.larger};
  flex-direction: column;
  .sc-input-wrapper {
    width: 200px;
  }
`;

const ActionContainer = styled.div`
  display: flex;
  margin: ${padding.large} 0;
  justify-content: flex-end;
  button {
    margin-right: ${padding.large};
  }
`;

const Preferences = props => {
  const { intl } = props;
  const history = useHistory();

  const theme = useSelector(state => state.config.theme);
  const languages = ['English', 'Français'];
  const themes = ['Light', 'Dark'];

  const initialValues = {
    language: localStorage.getItem(LANGUAGE),
    theme: localStorage.getItem(THEME),
  };

  return (
    <PreferencesContainer>
      <BreadcrumbContainer>
        <Breadcrumb
          activeColor={theme.brand.secondary}
          paths={[
            <BreadcrumbLabel>{intl.messages.preferences}</BreadcrumbLabel>,
          ]}
        />
      </BreadcrumbContainer>
      <SetPreferenceLayout>
        <Formik
          initialValues={initialValues}
          onSubmit={values => {
            const newPreferences = { ...values };
            localStorage.setItem(LANGUAGE, newPreferences.language);
            localStorage.setItem(THEME, newPreferences.theme);
          }}
        >
          {formikProps => {
            const {
              values,
              handleChange,
              errors,
              touched,
              setFieldTouched,
              dirty,
              setFieldValue,
            } = formikProps;

            //touched is not "always" correctly set
            const handleOnBlur = e => setFieldTouched(e.target.name, true);
            const handleSelectChange = field => selectedObj => {
              setFieldValue(field, selectedObj ? selectedObj.value : '');
            };
            //get the select item from the object array
            const getSelectedObjectItem = (items, selectedValue) => {
              return items.find(item => item.value === selectedValue);
            };

            const optionsLanguages = languages.map(language => {
              return {
                label: language,
                value: language,
                'data-cy': `languages-${language}`,
              };
            });
            const optionsThemes = themes.map(theme => {
              return {
                label: theme,
                value: theme,
                'data-cy': `themes-${theme}`,
              };
            });

            return (
              <Form>
                <FormSection>
                  <Input
                    id="language_input"
                    label={intl.messages.language}
                    clearable={false}
                    type="select"
                    options={optionsLanguages}
                    noOptionsMessage={() => intl.messages.no_results}
                    name="language"
                    onChange={handleSelectChange('language')}
                    value={getSelectedObjectItem(
                      optionsLanguages,
                      values?.language,
                    )}
                    error={touched.language && errors.language}
                    onBlur={handleOnBlur}
                  />
                  <Input
                    id="theme_input"
                    label={intl.messages.theme}
                    clearable={false}
                    type="select"
                    options={optionsThemes}
                    noOptionsMessage={() => intl.messages.no_results}
                    name="theme"
                    onChange={handleSelectChange('theme')}
                    value={getSelectedObjectItem(optionsThemes, values?.theme)}
                    error={touched.theme && errors.theme}
                    onBlur={handleOnBlur}
                  />
                </FormSection>
                <ActionContainer>
                  <Button
                    text={intl.messages.cancel}
                    type="button"
                    outlined
                    onClick={() => history.push(`/`)} // should push to where it came
                  />
                  <Button
                    text={intl.messages.save}
                    type="submit"
                    disabled={!isEmpty(errors)}
                    data-cy="submit-save-preferences"
                  />
                </ActionContainer>
              </Form>
            );
          }}
        </Formik>
      </SetPreferenceLayout>
    </PreferencesContainer>
  );
};

export default injectIntl(Preferences);
