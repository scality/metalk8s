import React from 'react';
import { IntlProvider } from 'react-intl';
import translations_en from '../translations/en.json';
import translations_fr from '../translations/fr.json';
const messages = {
  EN: translations_en,
  FR: translations_fr,
};

const FederatedIntlProvider = ({ children }: { children: React.ReactNode }) => {
  const { language } = window.shellHooks.useLanguage();
  return (
    <IntlProvider locale={language} messages={messages[language.toUpperCase()]}>
      {children}
    </IntlProvider>
  );
};

export default FederatedIntlProvider;
