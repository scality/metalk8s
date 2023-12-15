import {
  CoreUITheme,
  coreUIAvailableThemes,
  coreUIAvailableThemesNames,
} from '@scality/core-ui/dist/style/theme';
import React, { useContext, useState } from 'react';
import { useShellConfig } from './ShellConfigProvider';
type ThemeMode = 'dark' | 'light';
type ThemeContextValues = {
  themeMode: ThemeMode;
  theme: CoreUITheme;
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

export function useShellThemeSelector(): ThemeContextValues {
  const themeContext: ThemeContextValues = useContext(
    window.shellContexts.ShellThemeContext,
  );

  if (themeContext === null) {
    throw new Error(
      "useShellThemeSelector hook can't be use outside <ShellThemeSelectorProvider />",
    );
  }

  return { ...themeContext };
}

export function ShellThemeSelectorProvider({
  children,
}: {
  children: (theme: CoreUITheme, themeName: ThemeMode) => React.ReactNode;
  onThemeChanged?: (evt: CustomEvent) => void;
}) {
  const [themeMode, setThemeMode] = useState<ThemeMode>(
    (localStorage.getItem('theme') as ThemeMode) || 'dark',
  );
  const {
    config: { themes },
  } = useShellConfig();

  const themeDescription = themes[themeMode];
  if (!themeDescription) {
    throw new Error(
      `${themeMode} is incorrect, only dark and light are allowed`,
    );
  }

  if (!['custom', 'core-ui'].includes(themeDescription.type)) {
    throw new Error(
      `${themeDescription.type} is not a valid theme type, use either custom or core-ui`,
    );
  }

  if (
    themeDescription.type === 'core-ui' &&
    !coreUIAvailableThemesNames.includes(themeDescription.name)
  ) {
    throw new Error(
      `${
        themeDescription.name
      } does not exist in core-ui themes. Available themes : ${coreUIAvailableThemesNames.join(
        ', ',
      )}`,
    );
  }
  const selectedTheme =
    themeDescription.type === 'custom'
      ? themeDescription.colors
      : coreUIAvailableThemes[themeDescription.name];

  const assets = {
    logoPath: themeDescription.logoPath,
  };

  const changeThemeMode = (themeMode: ThemeMode) => {
    setThemeMode(themeMode);
    localStorage.setItem('theme', themeMode);
  };

  return (
    <window.shellContexts.ShellThemeContext.Provider
      value={{
        themeMode,
        setThemeMode: changeThemeMode,
        theme: selectedTheme,
        assets,
      }}
    >
      {children(selectedTheme, themeMode)}
    </window.shellContexts.ShellThemeContext.Provider>
  );
}
