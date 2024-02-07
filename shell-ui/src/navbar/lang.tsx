import React, {
  useContext,
  useState,
  useLayoutEffect,
  createContext,
} from 'react';
import { IntlProvider } from 'react-intl';
import translations_en from './translations/en.json';
import translations_fr from './translations/fr.json';
import { LANGUAGE_CHANGED_EVENT } from './events';

if (!window.shellContexts) {
  // @ts-expect-error - FIXME when you are working on it
  window.shellContexts = {};
}
// @ts-expect-error - FIXME when you are working on it
if (!window.shellContexts.LanguageContext) {
  // @ts-expect-error - FIXME when you are working on it
  window.shellContexts.LanguageContext = createContext(null);
}

type Language = 'en' | 'fr';
export const languages: Language[] = ['en', 'fr'];
const messages = {
  EN: translations_en,
  FR: translations_fr,
};
export function useLanguage(): {
  language: Language;
  setLanguage: (language: Language) => void;
  unSelectedLanguages: Language[];
} {
  // @ts-expect-error - FIXME when you are working on it
  const languageContext = useContext(window.shellContexts.LanguageContext);

  if (languageContext === null) {
    throw new Error(
      "useLanguage hook can't be use outside <LanguageProvider/>",
    );
  }

  return {
    // @ts-expect-error - FIXME when you are working on it
    language: languageContext.language,
    // @ts-expect-error - FIXME when you are working on it
    setLanguage: languageContext.setLanguage,
    unSelectedLanguages: languages.filter(
      // @ts-expect-error - FIXME when you are working on it
      (lang) => lang !== languageContext.language,
    ),
  };
}
export function LanguageProvider({
  children,
  canChangeLanguage,
  onLanguageChanged,
}: {
  children: React.ReactNode;
  canChangeLanguage?: boolean;
  onLanguageChanged?: (evt: CustomEvent) => void;
}) {
  const [language, setLang] = useState<Language>(
    canChangeLanguage
      ? (localStorage.getItem('lang') as any as Language) ||
          (navigator.language.startsWith('fr') ? 'fr' : 'en')
      : 'en',
  );
  useLayoutEffect(() => {
    if (onLanguageChanged) {
      onLanguageChanged(
        new CustomEvent(LANGUAGE_CHANGED_EVENT, {
          detail: language,
        }),
      );
    }
  }, [language, !onLanguageChanged]);

  const setLanguage = (lang: Language) => {
    setLang(lang);
    localStorage.setItem('lang', lang);
  };

  return (
    // @ts-expect-error - FIXME when you are working on it
    <window.shellContexts.LanguageContext.Provider
      value={{
        language,
        setLanguage,
      }}
    >
      <IntlProvider
        locale={language}
        messages={messages[language.toUpperCase()]}
      >
        {children}
      </IntlProvider>
      {/* @ts-expect-error - FIXME when you are working on it */}
    </window.shellContexts.LanguageContext.Provider>
  );
}
