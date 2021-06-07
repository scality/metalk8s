//@flow
import React, { useContext, useState, type Node, useLayoutEffect } from 'react';
import * as reactIntl  from 'react-intl';
import { IntlProvider } from 'react-intl';
import translations_en from './translations/en';
import translations_fr from './translations/fr';
import { LANGUAGE_CHANGED_EVENT } from './events';

console.log('shell-react-intl', reactIntl)

const LanguageContext = React.createContext(null);

type Language = 'en' | 'fr';

export const languages: Language[] = ['en', 'fr'];

const messages = {
  EN: translations_en,
  FR: translations_fr,
};

export function useLanguage(): {
  language: Language,
  setLanguage: (language: Language) => void,
  unSelectedLanguages: Language[],
} {
  const languageContext = useContext(LanguageContext);
  if (languageContext === null) {
    throw new Error(
      "useLanguage hook can't be use outside <LanguageProvider/>",
    );
  }
  return {
    language: languageContext.language,
    setLanguage: languageContext.setLanguage,
    unSelectedLanguages: languages.filter(
      (lang) => lang !== languageContext.language,
    ),
  };
}

export function LanguageProvider({
  children,
  canChangeLanguage,
  onLanguageChanged,
}: {
  children: Node,
  canChangeLanguage: boolean,
  onLanguageChanged?: (evt: CustomEvent) => void,
}): Node {
  const [language, setLang] = useState<Language>(
    canChangeLanguage
      ? ((localStorage.getItem('lang'): any): Language) ||
          (navigator.language.startsWith('fr') ? 'fr' : 'en')
      : 'en',
  );

  useLayoutEffect(() => {
    if (onLanguageChanged) {
      onLanguageChanged(
        new CustomEvent(LANGUAGE_CHANGED_EVENT, { detail: language }),
      );
    }
  }, [language, !onLanguageChanged]);

  const setLanguage = (lang: Language) => {
    setLang(lang);
    localStorage.setItem('lang', lang);
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      <IntlProvider
        locale={language}
        messages={messages[language.toUpperCase()]}
      >
        {children}
      </IntlProvider>
    </LanguageContext.Provider>
  );
}
