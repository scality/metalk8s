import React, { useContext, useState, useLayoutEffect } from 'react';
import {
  CoreUITheme,
  coreUIAvailableThemes,
} from '@scality/core-ui/dist/style/theme';
import { THEME_CHANGED_EVENT } from '../navbar/events';
import { useShellConfig } from './ShellConfigProvider';
type ThemeMode = 'dark' | 'light';
type ThemeContextValues = {
  themeMode: ThemeMode; // dark ou light
  theme: CoreUITheme; // colors json
  setThemeMode: (themeMode: ThemeMode) => void;
  assets: { logoPath: string };
};

if (!window.shellContexts) {
  window.shellContexts = {};
}

if (!window.shellContexts.ShellThemeContext) {
  window.shellContexts.ShellThemeContext =
    React.createContext<ThemeContextValues | null>(null);
}

export function useThemeName(): ThemeContextValues {
  const themeContext = useContext(window.shellContexts.ShellThemeContext);

  if (themeContext === null) {
    throw new Error("useTheme hook can't be use outside <ThemeProvider/>");
  }

  return { ...themeContext };
}

export function useShellThemeAssets() {
  const themeContext = useContext(window.shellContexts.ShellThemeContext);

  if (themeContext === null) {
    throw new Error(
      "useShellThemeAssets hook can't be use outside <ShellThemeSelectorProvider />",
    );
  }
  console.log('themeContext', themeContext);
  // return le logo a partir de useShellConfig
  //recupere le theme actuel et récupere le bon logo

  const { config } = useShellConfig();
  const assets = {
    logoPath: config.themes[themeContext.themeName].logoPath,
  };
  // based on current themeName, return the logoPath
  const exampleOfReturn = {
    logoPath: '/brand/assets/logo-dark.svg',
  };

  return assets;
}

export function useShellThemeSelector() {
  const themeContext = useContext(window.shellContexts.ShellThemeContext);

  if (themeContext === null) {
    throw new Error(
      "useThemeSelector hook can't be use outside <ThemeProvider/>",
    );
  }

  return { ...themeContext };
}

// type ThemeContextValues = {
//   themeMode: ThemeMode; // dark ou light
//   theme: CoreUITheme; // colors json
//   setThemeMode: (themeMode: ThemeMode) => void;
//   assets: { logoPath: string };
// };
export function ShellThemeSelectorProvider({
  children,
  onThemeChanged,
}: {
  children: (theme: CoreUITheme, themeName: ThemeMode) => React.ReactNode;
  onThemeChanged?: (evt: CustomEvent) => void;
}) {
  const [themeMode, setThemeMode] = useState<ThemeMode>(
    (localStorage.getItem('theme') as any) || 'dark',
  );
  const { config } = useShellConfig();
  console.log('config', config);
  const { themes } = config;
  console.log('themeName', themeMode);
  console.log('themes', themes);
  const theme: CoreUITheme = coreUIAvailableThemes[themes[themeMode].name];
  const assets = {
    logoPath: themes[themeMode].logoPath,
  };

  const res = {
    themeMode: 'dark',
    theme: { bacgrkound: 'toto' }, // colors json
    setThemeMode: () => {},
    assets: { logoPath: '/logo.svg' },
  };
  // useLayoutEffect(() => {
  //   localStorage.setItem('theme', themeMode);

  //   if (onThemeChanged) {
  //     onThemeChanged(
  //       new CustomEvent(THEME_CHANGED_EVENT, {
  //         detail: theme,
  //       }),
  //     );
  //   }
  // }, [themeMode, !!onThemeChanged]);
  return (
    <window.shellContexts.ShellThemeContext.Provider
      value={{
        themeMode,
        setThemeMode,
        theme,
        assets,
      }}
    >
      {children(theme, themeMode)}
    </window.shellContexts.ShellThemeContext.Provider>
  );
}
