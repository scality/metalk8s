//@flow
import React, { type Node, useEffect } from 'react';
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
  moduleExports: {},
  children: Node,
}): Node => {
  const { language } = moduleExports['./lang'].useLanguage();

  useEffect(() => {
    document.title = messages[language.toUpperCase()].product_name;
    // eslint-disable-next-line
  }, [language]);

  return (
    <IntlProvider locale={language} messages={messages[language.toUpperCase()]}>
      {children}
    </IntlProvider>
  );
};

const FederatedIntlProvider = ({ children }: { children: Node }): Node => {
  return (
    <ComponentWithFederatedImports
      componentWithInjectedImports={InternalIntlProvider}
      renderOnError={<ErrorPage500 />}
      componentProps={{ children }}
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
