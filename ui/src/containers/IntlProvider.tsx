import React from 'react';
import { IntlProvider } from 'react-intl';
import { ErrorPage500 } from '@scality/core-ui';
import { ComponentWithFederatedImports } from '@scality/module-federation';
import translations_en from '../translations/en';
import translations_fr from '../translations/fr';
const messages = {
  EN: translations_en,
  FR: translations_fr,
};

const InternalIntlProvider = ({
  moduleExports,
  children,
}: {
  moduleExports: {};
  children: React.ReactNode;
}) => {
  const { language } = moduleExports['./lang'].useLanguage();
  return (
    <IntlProvider locale={language} messages={messages[language.toUpperCase()]}>
      {children}
    </IntlProvider>
  );
};

const FederatedIntlProvider = ({ children }: { children: React.ReactNode }) => {
  return (
    <ComponentWithFederatedImports
      componentWithInjectedImports={InternalIntlProvider}
      renderOnError={<ErrorPage500 data-cy="sc-error-page500" />}
      componentProps={{
        children,
      }}
      federatedImports={[
        {
          scope: 'shell',
          module: './lang',
          remoteEntryUrl: window.shellUIRemoteEntryUrl,
        },
      ]}
    />
  );
};

export default FederatedIntlProvider;
