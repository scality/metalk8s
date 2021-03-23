//@flow
import React, { useContext, useState, type Node, useLayoutEffect } from 'react';
import { LANGUAGE_CHANGED_EVENT } from '.';

const LanguageContext = React.createContext(null);

type Language = 'en' | 'fr';

export const languages: Language[] = ['en', 'fr'];

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
  onLanguageChanged,
}: {
  children: Node,
  onLanguageChanged?: (evt: CustomEvent) => void,
}): Node {
  const [language, setLang] = useState<Language>(
    ((localStorage.getItem('lang'): any): Language) || 'en',
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
      {children}
    </LanguageContext.Provider>
  );
}
