import React from 'react';
type Language = 'en' | 'fr';
export declare const languages: Language[];
export declare function useLanguage(): {
    language: Language;
    setLanguage: (language: Language) => void;
    unSelectedLanguages: Language[];
};
export declare function LanguageProvider({ children, canChangeLanguage, onLanguageChanged, }: {
    children: React.ReactNode;
    canChangeLanguage?: boolean;
    onLanguageChanged?: (evt: CustomEvent) => void;
}): JSX.Element;
export {};
