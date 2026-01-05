# Module Federation Migration Plan: Bridge-React Integration

## Executive Summary

This plan details the migration from the current `@scality/module-federation` custom hook-passing approach to the new `@module-federation/bridge-react` pattern with a unified Zustand store (`shellStore`) for state sharing.

---

## Architecture Overview

### Current Architecture (Legacy)

```
┌─────────────────────────────────────────────────────────────┐
│                         Shell                                │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  ShellHooksProvider                                  │    │
│  │  ├── shellHooks (useAuth, useConfig, etc.)          │    │
│  │  └── shellAlerts (AlertProvider, useAlerts, etc.)   │    │
│  └─────────────────────────────────────────────────────┘    │
│                           │                                  │
│                    props injection                           │
│                           ▼                                  │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  FederatedComponent                                  │    │
│  │  └── MicroApp (FederableApp.tsx)                    │    │
│  │       └── useShellHooks() → Context consumption     │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

### New Architecture (Bridge-React)

```
┌──────────────────────────────────────────────────────────────────────┐
│                              Shell                                    │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │              shellStore (Zustand Vanilla - Slices Pattern)      │  │
│  │  ┌────────────┐ ┌────────────┐ ┌─────────┐ ┌────────────────┐  │  │
│  │  │ AuthSlice  │ │ConfigSlice │ │ UISlice │ │NavigationSlice │  │  │
│  │  │ ─────────  │ │ ────────── │ │ ─────── │ │ ───────────── │   │  │
│  │  │ userData   │ │ webFingers │ │ language│ │ shellNavigate │   │  │
│  │  │ getToken() │ │ getConfig()│ │ theme   │ │ openLink()    │   │  │
│  │  │ logout()   │ │ getApps()  │ │         │ │               │   │  │
│  │  └────────────┘ └────────────┘ └─────────┘ └────────────────┘  │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                │                                      │
│                props: { shellStore, queryClient, basename }           │
│                                ▼                                      │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │  createRemoteAppComponent (Bridge)                              │  │
│  │  └── MicroApp (FederableApp.tsx - bridge pattern)               │  │
│  │       └── useStore(shellStore, selector) → Direct slice access  │  │
│  └────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Phase 0: Foundation & Preparation

### 0.1 Dependencies Alignment

Ensure all micro apps have matching versions:

| Package | Version |
|---------|---------|
| `@module-federation/bridge-react` | `^0.22.0` |
| `@module-federation/enhanced` | `^0.21.6` |
| `zustand` | `^5.0.9` |
| `react-router` | `7.8.1` |
| `react-router-dom` | `7.8.1` |
| `@rspack/core` | `^1.6.7` |
| `@rspack/cli` | `^1.6.7` |

### 0.2 Micro-App Configuration Schema Update

Add `bridge` field to the micro-app-configuration schema:

```json
{
  "kind": "MicroAppConfiguration",
  "apiVersion": "ui.scality.com/v1alpha1",
  "metadata": {
    "kind": "metalk8s-ui"
  },
  "spec": {
    "bridge": true,
    "remoteEntryPath": "/mf-manifest.json",
    "views": {
      "platform": {
        "path": "/",
        "module": "./FederableApp",
        "scope": "metalk8s"
      }
    }
  }
}
```

**Detection Logic**:
- `spec.bridge === true` → Use `createRemoteAppComponent` (new bridge pattern)
- `spec.bridge === undefined` or `false` → Use `FederatedComponent` (legacy pattern)

### 0.3 Shared Libraries Configuration

The shared configuration must be synchronized across shell and all micro apps:

```typescript
shared: {
  react: { singleton: true, eager: true },
  'react-dom': { singleton: true, eager: true },
  'styled-components': { singleton: true },
  '@scality/core-ui': { singleton: true },
  zustand: { singleton: true, eager: true },
  'react-query': { singleton: true, eager: true },
}
```

> **⚠️ Important**: `react-router` and `react-router-dom` should **NOT** be shared with bridge-react pattern. Each app manages its own router instance.

---

## Phase 1: Shell-UI Modifications

### 1.1 Create Shell Store using Slices Pattern

Use Zustand's **Slices Pattern** to keep stores modular while combining them into a single bounded store.

#### Directory Structure

```
shell-ui/src/services/ShellStore/
├── index.ts              # Exports the combined store
├── store.ts              # Combined bounded store
├── types.ts              # Shared type definitions
├── slices/
│   ├── authSlice.ts      # Authentication slice
│   ├── configSlice.ts    # Configuration slice
│   ├── uiSlice.ts        # UI state slice (language, theme)
│   └── navigationSlice.ts # Navigation utilities
```

#### Auth Slice

**File**: `shell-ui/src/services/ShellStore/slices/authSlice.ts`

```typescript
import type { StateCreator } from 'zustand';
import type { UserData, AuthStatus, ShellState } from '../types';
import type { UserManager } from 'oidc-client-ts';

export interface AuthSlice {
  // State
  userData: UserData | null;
  authStatus: AuthStatus;
  userManager: UserManager | null;
  
  // Actions
  setAuth: (userData: UserData | null, status: AuthStatus) => void;
  setUserManager: (userManager: UserManager) => void;
  getToken: () => Promise<string | null>;
  logout: () => void;
  clearAuth: () => void;
  
  // Selectors
  isAuthenticated: () => boolean;
  getUsername: () => string | null;
  getGroups: () => string[];
}

export const createAuthSlice: StateCreator<
  ShellState,
  [],
  [],
  AuthSlice
> = (set, get) => ({
  // Initial state
  userData: null,
  authStatus: 'idle',
  userManager: null,
  
  // Actions
  setAuth: (userData, status) => {
    set({ userData, authStatus: status });
  },
  
  setUserManager: (userManager) => {
    set({ userManager });
  },
  
  getToken: async () => {
    const { userManager } = get();
    if (!userManager) return null;
    const user = await userManager.getUser();
    return user?.access_token ?? null;
  },
  
  logout: () => {
    const { userManager } = get();
    if (userManager) {
      userManager.signoutRedirect();
    }
    set({ userData: null, authStatus: 'unauthenticated' });
  },
  
  clearAuth: () => {
    set({ userData: null, authStatus: 'unauthenticated' });
  },
  
  // Selectors
  isAuthenticated: () => {
    const { userData, authStatus } = get();
    return authStatus === 'authenticated' && userData !== null;
  },
  
  getUsername: () => get().userData?.username ?? null,
  
  getGroups: () => get().userData?.groups ?? [],
});
```

#### Configuration Slice

**File**: `shell-ui/src/services/ShellStore/slices/configSlice.ts`

```typescript
import type { StateCreator } from 'zustand';
import type { 
  ShellState, 
  WebFingerResult, 
  SolutionUI, 
  ShellConfig,
  ConfigParams,
  BuildtimeWebFinger,
  RuntimeWebFinger,
} from '../types';

export interface ConfigSlice {
  // State
  webFingers: WebFingerResult[];
  deployedApps: SolutionUI[];
  shellConfig: ShellConfig | null;
  
  // Actions
  setWebFingers: (webFingers: WebFingerResult[]) => void;
  setDeployedApps: (apps: SolutionUI[]) => void;
  setShellConfig: (config: ShellConfig) => void;
  
  // Selectors
  getConfiguration: <T extends 'build' | Record<string, unknown>>(
    params: ConfigParams
  ) => (T extends 'build' ? BuildtimeWebFinger : RuntimeWebFinger<T>) | null;
  getDeployedApps: (filter?: { name?: string; kind?: string }) => SolutionUI[];
}

export const createConfigSlice: StateCreator<
  ShellState,
  [],
  [],
  ConfigSlice
> = (set, get) => ({
  // Initial state
  webFingers: [],
  deployedApps: [],
  shellConfig: null,
  
  // Actions
  setWebFingers: (webFingers) => {
    const current = get().webFingers;
    const hasChanged = 
      current.length !== webFingers.length ||
      current.some((item, idx) => 
        item.status !== webFingers[idx]?.status ||
        JSON.stringify(item.data) !== JSON.stringify(webFingers[idx]?.data)
      );
    if (hasChanged) {
      set({ webFingers });
    }
  },
  
  setDeployedApps: (deployedApps) => {
    set({ deployedApps });
  },
  
  setShellConfig: (shellConfig) => {
    set({ shellConfig });
  },
  
  // Selectors
  getConfiguration: ({ configType, name, url }) => {
    const { webFingers, deployedApps } = get();
    
    const apps = deployedApps.filter(app => app.name === name);
    if (!apps.length) return null;
    
    const configs = webFingers
      .filter(wf => 
        wf.status === 'success' &&
        ((configType === 'build' && wf.data?.kind === 'MicroAppConfiguration') ||
         (configType === 'run' && wf.data?.kind === 'MicroAppRuntimeConfiguration'))
      )
      .map(wf => wf.data);
    
    return configs.find(config => {
      if (config.kind === 'MicroAppRuntimeConfiguration') {
        return config.metadata.name === name;
      }
      if (config.kind === 'MicroAppConfiguration') {
        if (url) return config.metadata.url === url;
        return config.metadata.kind === apps[0].kind;
      }
      return false;
    }) ?? null;
  },
  
  getDeployedApps: (filter) => {
    const { deployedApps } = get();
    if (!filter) return deployedApps;
    
    return deployedApps.filter(app => {
      if (filter.name && app.name !== filter.name) return false;
      if (filter.kind && app.kind !== filter.kind) return false;
      return true;
    });
  },
});
```

#### UI Slice

**File**: `shell-ui/src/services/ShellStore/slices/uiSlice.ts`

```typescript
import type { StateCreator } from 'zustand';
import type { ShellState } from '../types';

export type Language = 'en' | 'fr';
export type Theme = 'dark' | 'light';

export interface UISlice {
  // State
  language: Language;
  theme: Theme;
  
  // Actions
  setLanguage: (lang: Language) => void;
  setTheme: (theme: Theme) => void;
}

export const createUISlice: StateCreator<
  ShellState,
  [],
  [],
  UISlice
> = (set) => ({
  language: 'en',
  theme: 'dark',
  
  setLanguage: (language) => set({ language }),
  setTheme: (theme) => set({ theme }),
});
```

#### Navigation Slice

**File**: `shell-ui/src/services/ShellStore/slices/navigationSlice.ts`

```typescript
import type { StateCreator } from 'zustand';
import type { ShellState, LinkTarget } from '../types';

export interface NavigationSlice {
  // Navigation function (set by shell)
  shellNavigate: ((path: string) => void) | null;
  
  // Actions
  setShellNavigate: (navigate: (path: string) => void) => void;
  openLink: (to: LinkTarget) => void;
}

export const createNavigationSlice: StateCreator<
  ShellState,
  [],
  [],
  NavigationSlice
> = (set, get) => ({
  shellNavigate: null,
  
  setShellNavigate: (navigate) => {
    set({ shellNavigate: navigate });
  },
  
  openLink: (to) => {
    const { shellNavigate } = get();
    
    if (to.isExternal) {
      const url = to.isFederated 
        ? to.app!.appHistoryBasePath + to.view!.path
        : to.url!;
      window.open(url, '_blank');
    } else if (to.isFederated && shellNavigate) {
      shellNavigate(to.app!.appHistoryBasePath + to.view!.path);
    } else if (!to.isFederated) {
      window.location.href = to.url!;
    }
  },
});
```

#### Combined Bounded Store

**File**: `shell-ui/src/services/ShellStore/store.ts`

```typescript
import { createStore } from 'zustand/vanilla';
import { useStore } from 'zustand';
import { createAuthSlice, AuthSlice } from './slices/authSlice';
import { createConfigSlice, ConfigSlice } from './slices/configSlice';
import { createUISlice, UISlice } from './slices/uiSlice';
import { createNavigationSlice, NavigationSlice } from './slices/navigationSlice';

// Combined state type
export type ShellState = AuthSlice & ConfigSlice & UISlice & NavigationSlice;

// Create the bounded store (vanilla for passing to micro apps)
export const shellStore = createStore<ShellState>()((...a) => ({
  ...createAuthSlice(...a),
  ...createConfigSlice(...a),
  ...createUISlice(...a),
  ...createNavigationSlice(...a),
}));

// React hook for shell-internal usage
export const useShellStore = <T>(selector: (state: ShellState) => T): T => {
  return useStore(shellStore, selector);
};
```

#### Export Index

**File**: `shell-ui/src/services/ShellStore/index.ts`

```typescript
export { shellStore, useShellStore } from './store';
export type { ShellState } from './store';
export type { AuthSlice } from './slices/authSlice';
export type { ConfigSlice } from './slices/configSlice';
export type { UISlice } from './slices/uiSlice';
export type { NavigationSlice } from './slices/navigationSlice';
export * from './types';
```

### 1.2 Shell Store Type Definitions

**File**: `shell-ui/src/services/ShellStore/types.ts`

```typescript
import type { User, UserManager } from 'oidc-client-ts';
import type { UseQueryResult } from 'react-query';

export interface UserData {
  token: string;
  username: string;
  email: string;
  groups: string[];
  id: string;
  original: User;
}

export type AuthStatus = 'idle' | 'loading' | 'authenticated' | 'unauthenticated';

export interface SolutionUI {
  name: string;
  kind: string;
  version: string;
  url: string;
  appHistoryBasePath: string;
}

export interface View {
  path: string;
  activeIfMatches?: string;
  exact?: boolean;
  strict?: boolean;
  sensitive?: boolean;
  label: { en: string; fr: string };
  module: string;
  scope: string;
}

export interface BuildtimeWebFinger {
  kind: 'MicroAppConfiguration';
  apiVersion: string;
  metadata: { kind: string; url?: string };
  spec: {
    bridge?: boolean;
    remoteEntryPath: string;
    views: Record<string, View>;
    hooks: Record<string, { module: string; scope: string }>;
    components: Record<string, { module: string; scope: string }>;
    navbarUpdaterComponents?: { module: string; scope: string }[];
  };
}

export interface RuntimeWebFinger<T = Record<string, unknown>> {
  kind: 'MicroAppRuntimeConfiguration';
  apiVersion: string;
  metadata: { kind: string; name: string };
  spec: {
    title: string;
    selfConfiguration: T;
    auth: OIDCConfig | OAuth2ProxyConfig;
  };
}

export interface OIDCConfig {
  kind: 'OIDC';
  providerUrl: string;
  redirectUrl: string;
  clientId: string;
  responseType: string;
  scopes: string;
  providerLogout?: boolean;
  defaultDexConnector?: string;
}

export interface OAuth2ProxyConfig {
  kind: 'OAuth2Proxy';
}

export interface ShellConfig {
  discoveryUrl: string;
  navbar: {
    main: NavbarEntry[];
    subLogin: NavbarEntry[];
  };
  userGroupsMapping?: Record<string, string[]>;
}

export interface NavbarEntry {
  kind?: string;
  view?: string;
  url?: string;
  isExternal?: boolean;
  icon?: string;
  label?: { en: string; fr: string };
  groups?: string[];
}

export interface ConfigParams {
  configType: 'build' | 'run';
  name: string;
  url?: string;
}

export interface LinkTarget {
  isFederated: boolean;
  isExternal?: boolean;
  app?: SolutionUI;
  view?: View;
  url?: string;
}

export type WebFingerResult = UseQueryResult<
  BuildtimeWebFinger | RuntimeWebFinger,
  unknown
>;
```

### 1.3 Bridge Router Integration

**File**: `shell-ui/src/FederatedApp.tsx`

```typescript
import { createInstance, createRemoteAppComponent } from '@module-federation/enhanced/runtime';
import BridgeReactPlugin from '@module-federation/bridge-react/plugin';
import { shellStore } from './services/ShellStore';
import { queryClient } from './QueryClientProvider';

const mf = createInstance({
  name: 'federation_consumer',
  remotes: [],
  plugins: [BridgeReactPlugin()],
});

// Factory to create bridge components
const createBridgeMicroApp = (scope: string, module: string, url: string) => {
  mf.registerRemotes([{ name: scope, entry: url }]);
  return createRemoteAppComponent({
    loader: () => mf.loadRemote(`${scope}/${module}`),
    fallback: ({ error }) => <ErrorFallback error={error} />,
    loading: <Loader size="massive" centered />,
  });
};

// Route component that handles both legacy and bridge modes
function MicroAppRoute({ app, view }: { app: SolutionUI; view: View }) {
  const { retrieveConfiguration } = useConfigRetriever();
  
  const appBuildConfig = retrieveConfiguration<'build'>({
    configType: 'build',
    name: app.name,
  });
  
  // Check if app uses bridge mode
  const usesBridge = appBuildConfig?.spec.bridge === true;
  
  if (usesBridge) {
    const BridgeComponent = createBridgeMicroApp(
      view.scope,
      view.module,
      `${app.url}${appBuildConfig.spec.remoteEntryPath}`,
    );
    
    return (
      <BridgeComponent
        basename={app.appHistoryBasePath}
        shellStore={shellStore}
        queryClient={queryClient}
      />
    );
  }
  
  // Legacy mode
  return (
    <FederatedComponent
      url={`${app.url}${appBuildConfig?.spec.remoteEntryPath}`}
      module={view.module}
      scope={view.scope}
      props={{ shellHooks, shellAlerts }}
      app={app}
    />
  );
}
```

### 1.4 Store Population in Shell

Ensure the shell populates `shellStore` from existing providers. Each slice is populated by its corresponding provider.

**File**: `shell-ui/src/initFederation/ConfigurationProviders.tsx`

```typescript
import { shellStore } from '../services/ShellStore';

export const ConfigurationProvider = ({ children }) => {
  const { updateWebFingersState } = useWebFingersStore();
  const deployedUIs = useDeployedApps();
  
  const results = useQueries(/* ... */);
  
  useMemo(() => {
    // Legacy context update (for FederableApp consumers)
    updateWebFingersState(results);
    
    // New store update (ConfigSlice)
    shellStore.getState().setWebFingers(results);
    shellStore.getState().setDeployedApps(deployedUIs);
  }, [results, deployedUIs]);
  
  // ...
};
```

**File**: `shell-ui/src/initFederation/ShellConfigProvider.tsx`

```typescript
import { shellStore } from '../services/ShellStore';

// When shell config is loaded
useEffect(() => {
  if (config) {
    shellStore.getState().setShellConfig(config);
  }
}, [config]);
```

**File**: `shell-ui/src/auth/AuthProvider.tsx`

```typescript
import { shellStore } from '../services/ShellStore';

// Store userManager on initialization
useEffect(() => {
  shellStore.getState().setUserManager(userManager);
}, [userManager]);

// On sign in
const onSignIn = (userData: User | null) => {
  const myUserData: UserData = {
    token: userData.access_token,
    username: userData.profile?.name,
    // ...
  };
  
  // Update AuthSlice
  shellStore.getState().setAuth(myUserData, 'authenticated');
};
```

**File**: `shell-ui/src/navbar/lang.tsx`

```typescript
import { shellStore } from '../services/ShellStore';

// Sync language changes
useEffect(() => {
  shellStore.getState().setLanguage(language);
}, [language]);
```

**File**: `shell-ui/src/initFederation/ShellHistoryProvider.tsx`

```typescript
import { shellStore } from '../services/ShellStore';

// Provide shell navigation to the store
const navigate = useNavigate();

useEffect(() => {
  shellStore.getState().setShellNavigate(navigate);
}, [navigate]);
```

### 1.5 Rspack Configuration

**File**: `shell-ui/rspack.config.ts`

```typescript
new ModuleFederationPlugin({
  bridge: {
    enableBridgeRouter: true,
  },
  name: 'shell',
  filename: 'remoteEntry.js',
  exposes: {
    // Keep legacy exports for retrocompatibility
    './App': './src/FederatedApp.tsx',
    './lang': './src/navbar/lang.tsx',
    './auth/AuthProvider': './src/auth/AuthProvider.tsx',
    './alerts/AlertProvider': './src/alerts/AlertProvider.tsx',
    './alerts/alertHooks': './src/alerts/alertHooks.ts',
    // ... other legacy exports
    
    // Note: shellStore is NOT exposed via Module Federation
    // It's passed as a prop to bridge components
  },
  shared: {
    // ... shared config
    zustand: { singleton: true, eager: true },
  },
}),
```

---

## Phase 2: Micro App Migration Template

### 2.1 New Entry Point Structure

**File**: `ui/src/FederableApp.tsx` (Bridge Pattern)

```typescript
import { createBridgeComponent } from '@module-federation/bridge-react/v18';
import { useStore } from 'zustand';
import type { ShellState } from 'shell/services/ShellStore/types';

interface MicroAppProps {
  basename: string;
  shellStore: StoreApi<ShellState>;
  queryClient: QueryClient;
}

// Internal provider that bridges shell store to app needs
const ShellStoreProvider = ({ 
  shellStore, 
  children 
}: { 
  shellStore: StoreApi<ShellState>; 
  children: React.ReactNode;
}) => {
  // Create React context for easier consumption
  return (
    <ShellStoreContext.Provider value={shellStore}>
      {children}
    </ShellStoreContext.Provider>
  );
};

const FederableApp = (props: MicroAppProps) => {
  const { basename, shellStore, queryClient } = props;
  
  return (
    <QueryClientProvider client={queryClient}>
      <ShellStoreProvider shellStore={shellStore}>
        <Provider store={reduxStore}>
          <BrowserRouter basename={basename}>
            <AppContent />
          </BrowserRouter>
        </Provider>
      </ShellStoreProvider>
    </QueryClientProvider>
  );
};

export default createBridgeComponent({
  rootComponent: FederableApp,
});
```

### 2.2 Shell Store Consumption Hooks

Create wrapper hooks for consuming shell store in micro apps:

**File**: `ui/src/hooks/useShellStore.ts`

```typescript
import { useContext } from 'react';
import { useStore } from 'zustand';
import type { ShellState } from '../types/shell';

const ShellStoreContext = createContext<StoreApi<ShellState> | null>(null);

export const useShellStoreContext = () => {
  const store = useContext(ShellStoreContext);
  if (!store) {
    throw new Error('useShellStoreContext must be used within ShellStoreProvider');
  }
  return store;
};

// Convenience hooks
export const useAuth = () => {
  const store = useShellStoreContext();
  return useStore(store, (state) => ({
    userData: state.userData,
    getToken: state.getToken,
    logout: state.logout,
  }));
};

export const useConfig = (params: ConfigParams) => {
  const store = useShellStoreContext();
  return useStore(store, (state) => state.getConfiguration(params));
};

export const useLanguage = () => {
  const store = useShellStoreContext();
  return useStore(store, (state) => ({
    language: state.language,
    setLanguage: state.setLanguage,
  }));
};

export const useLinkOpener = () => {
  const store = useShellStoreContext();
  return useStore(store, (state) => ({
    openLink: state.openLink,
  }));
};
```

### 2.3 Hook Replacement Map

| Old Pattern (Context-based) | New Pattern (Store-based) |
|----------------------------|---------------------------|
| `useShellHooks().useAuth()` | `useAuth()` from local hook |
| `useShellHooks().useConfig()` | `useConfig(params)` from local hook |
| `useBasenameRelativeNavigate()` | `useNavigate()` from React Router |
| `useCurrentApp()` | Access via `shellStore` or props |
| `useShellHooks().useLinkOpener()` | `useLinkOpener()` from local hook |
| `useShellHooks().useLanguage()` | `useLanguage()` from local hook |
| `useShellAlerts().useAlerts()` | See Alerts Migration section |

### 2.4 Micro App Rspack Configuration

**File**: `ui/rspack.config.ts`

```typescript
new ModuleFederationPlugin({
  bridge: {
    enableBridgeRouter: true,
  },
  name: 'metalk8s',
  filename: `static/js/remoteEntry.${version}.js`,
  exposes: {
    // New bridge entry point
    './FederableApp': './src/FederableApp.tsx',
    
    // Other exports
    './platformLibrary': './src/services/platformlibrary/k8s.ts',
    './AlertsNavbarUpdater': './src/components/AlertNavbarUpdaterComponent.tsx',
  },
  shared: {
    '@scality/core-ui': { singleton: true },
    'styled-components': { singleton: true },
    react: { singleton: true },
    'react-dom': { singleton: true },
    zustand: { singleton: true },
    // Note: react-router NOT shared
  },
}),
```

### 2.5 Update Micro-App Configuration

**File**: `ui/public/.well-known/micro-app-configuration`

```json
{
  "kind": "MicroAppConfiguration",
  "apiVersion": "ui.scality.com/v1alpha1",
  "metadata": {
    "kind": "metalk8s-ui"
  },
  "spec": {
    "bridge": true,
    "remoteEntryPath": "/mf-manifest.json",
    "views": {
      "platform": {
        "path": "/",
        "label": {
          "en": "Platform",
          "fr": "Plateforme"
        },
        "module": "./FederableApp",
        "scope": "metalk8s"
      },
      "alerts": {
        "path": "/alerts",
        "exact": true,
        "label": {
          "en": "Alerts",
          "fr": "Alertes"
        },
        "module": "./FederableApp",
        "scope": "metalk8s"
      }
    },
    "hooks": {
      "platform_library": {
        "module": "./platformLibrary",
        "scope": "metalk8s"
      }
    },
    "navbarUpdaterComponents": [
      {
        "module": "./AlertsNavbarUpdater",
        "scope": "metalk8s"
      }
    ],
    "publicPath": "/metalk8s"
  }
}
```

---

## Phase 3: Retrocompatibility Strategy

> **Key Point**: Only the **shell** needs to be retrocompatible. Micro apps migrate atomically from legacy to bridge—they do NOT need to support both modes.

### 3.1 Shell Retrocompatibility

The shell must support loading both legacy and bridge micro apps simultaneously:

```typescript
// shell-ui/src/initFederation/ConfigurationProviders.tsx

export type EnrichedBuildtimeWebFinger = BuildtimeWebFinger & {
  metadata: {
    url: string;
  };
  spec: BuildtimeWebFinger['spec'] & {
    bridge?: boolean;  // New field
  };
};

// In FederatedRoute or equivalent
function shouldUseBridge(appConfig: EnrichedBuildtimeWebFinger): boolean {
  return appConfig.spec.bridge === true;
}
```

#### Shell Responsibilities

| Mode | Shell Action |
|------|--------------|
| `spec.bridge: false` (or undefined) | Load via `FederatedComponent`, pass `shellHooks` and `shellAlerts` props |
| `spec.bridge: true` | Load via `createRemoteAppComponent`, pass `shellStore` and `queryClient` props |

### 3.2 Micro App Migration (No Dual Support Needed)

Micro apps do **NOT** maintain both patterns. When migrating, `FederableApp.tsx` is **rewritten** to use the bridge pattern:

```
BEFORE (Legacy Pattern)          AFTER (Bridge Pattern)
─────────────────────            ─────────────────────
ui/src/                          ui/src/
├── FederableApp.tsx             ├── FederableApp.tsx  (rewritten with bridge)
│   └── uses ShellHooksProvider  │   └── uses createBridgeComponent
├── containers/                  ├── containers/
│   └── App.tsx                  │   └── App.tsx
└── hooks/                       └── hooks/
    └── (legacy hooks)               └── useShellStore.ts
```

> **Note**: The entry point file name remains `FederableApp.tsx`—only its implementation changes from the legacy `ShellHooksProvider` pattern to the new `createBridgeComponent` pattern.

### 3.3 Atomic Migration Strategy (Per Micro App)

> **Key Principle**: Each micro app migrates **independently** but **atomically**.

#### What This Means

1. **Independent**: Different micro apps can migrate at their own pace
   - MetalK8s UI can migrate to bridge while another app remains legacy
   - No coordination required between apps

2. **Atomic (All-in-One)**: Within a single micro app, migration is NOT partial
   - ❌ Cannot have some components using legacy hooks while others use store
   - ✅ When migrating, ALL components switch to the new pattern
   - The `spec.bridge` flag is a binary toggle—either the entire app uses bridge or it doesn't

#### Why Atomic Migration?

| Approach | Problem |
|----------|---------|
| Partial/Conditional | Complex runtime detection, harder to debug, dual dependency paths |
| Atomic | Clean cut-over, simpler testing, easier rollback |

#### Migration Flow Per App

```
┌─────────────────────────────────────────────────────────────┐
│                    Shell (supports both modes)               │
│  ┌──────────────────┐              ┌──────────────────────┐ │
│  │ App A: Legacy    │              │ App B: Bridge        │ │
│  │ spec.bridge:false│              │ spec.bridge: true    │ │
│  │ FederableApp.tsx │              │ FederableApp.tsx     │ │
│  │ useShellHooks()  │              │ useShellStore()      │ │
│  │ Context-based    │              │ Zustand-based        │ │
│  └──────────────────┘              └──────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

#### Implementation Per Micro App

When migrating an app, update **all files at once**:

```typescript
// BEFORE (Legacy) - ALL components use this pattern
import { useShellHooks } from '@scality/module-federation';
const { useAuth } = useShellHooks();
const auth = useAuth();

// AFTER (Bridge) - ALL components switch to this pattern
import { useAuth } from '../hooks/useShellStore';
const auth = useAuth();
```

#### No Conditional Detection Needed

Since migration is atomic, components do NOT need runtime mode detection:

```typescript
// ❌ NOT RECOMMENDED - Conditional/hybrid approach
const useAuthMode = () => {
  try {
    return useAuthFromStore();  // new
  } catch {
    return useShellHooks().useAuth();  // legacy fallback
  }
};

// ✅ RECOMMENDED - Clean migration, one pattern per app
// Legacy app:
export const useAuth = () => {
  const { useAuth } = useShellHooks();
  return useAuth();
};

// Bridge app (after migration):
export const useAuth = () => {
  const store = useShellStoreContext();
  return useStore(store, (state) => ({
    userData: state.userData,
    getToken: state.getToken,
    logout: state.logout,
  }));
};
```

#### Rollback Strategy

If issues are found after migration, rollback options:

1. **Git revert**: Revert the migration commit to restore the legacy version of `FederableApp.tsx`
2. **Config toggle**: Set `spec.bridge: false` and revert `FederableApp.tsx` to legacy pattern

> **Recommendation**: The legacy version of `FederableApp.tsx` remains in git history. Rollback is a simple git revert of the migration commit.

### 3.4 Store Population Synchronization

**Critical**: Both legacy context AND new store must be populated during transition.

```typescript
// shell-ui/src/initFederation/ConfigurationProviders.tsx

useMemo(() => {
  // Legacy context update (for apps using FederableApp)
  updateWebFingersState(results);
  
  // New store update (for apps using bridge pattern)
  shellStore.getState().setWebFingers(results);
  shellStore.getState().setDeployedApps(deployedUIs);
}, [results, deployedUIs]);
```

---

## Phase 4: Critical Migration Areas

### 4.1 Authentication Flow

**Risk Level**: 🔴 High

#### Challenges
1. Token refresh via `userManager.getUser()`
2. Silent renewal event handlers
3. Logout propagation across apps
4. Store must be populated **before** any micro app renders

#### Implementation

```typescript
// In shellStore
getToken: async () => {
  const { userManager } = get();
  if (!userManager) {
    console.warn('UserManager not initialized');
    return null;
  }
  const user = await userManager.getUser();
  return user?.access_token ?? null;
},

logout: () => {
  const { userManager } = get();
  if (userManager) {
    userManager.signoutRedirect();
  }
  set({ userData: null, authStatus: 'unauthenticated' });
},
```

#### Attention Points
- [ ] Ensure `setUserManager` is called during auth initialization
- [ ] Handle silent renewal events in shell, update store
- [ ] Micro apps should not store tokens locally

### 4.2 Navigation Cross-App

**Risk Level**: 🟡 Medium

#### Files Affected (MetalK8s UI)
- `src/components/DashboardAlerts.tsx`
- `src/components/HealthItem.tsx`
- `src/components/DashboardInventory.tsx`
- `src/containers/Layout.tsx`
- `src/containers/AlertPage.tsx`
- `src/containers/VolumePageContent.tsx`
- `src/containers/NodePageContent.tsx`
- `src/components/VolumeOverviewTab.tsx`
- `src/components/NodePageVolumesTable.tsx`
- `src/components/ActiveAlertsCounter.tsx`
- `src/alert-configuration/ConfigureAlerting.tsx`

#### Migration Pattern

```typescript
// Old
import { useBasenameRelativeNavigate } from '@scality/module-federation';
const navigate = useBasenameRelativeNavigate();
navigate('/alerts');

// New
import { useNavigate } from 'react-router-dom';
const navigate = useNavigate();
navigate('/alerts');  // basename handled by BrowserRouter
```

### 4.3 React Query Context Sharing

**Risk Level**: 🔴 High

#### Key Requirement
Both shell and micro apps must use the **exact same** `QueryClient` instance.

```typescript
// FederableApp.tsx (Bridge Pattern)
const FederableApp = ({ queryClient, ...props }) => {
  return (
    <QueryClientProvider client={queryClient}>
      {/* App content */}
    </QueryClientProvider>
  );
};
```

#### Attention Points
- [ ] Do NOT create new `QueryClient` in micro apps
- [ ] Verify cache sharing works (same query key = shared data)
- [ ] Handle stale data scenarios during app transitions

### 4.4 Alerts System

**Risk Level**: 🟡 Medium

The current alert system is heavily context-based:

#### Current Structure
```
shell-ui/src/alerts/
├── AlertProvider.tsx      # React Context Provider
├── alertHooks.ts          # useAlerts, useHighestSeverityAlerts
├── alertContext.ts        # Context definition
└── services/
    ├── alertManager.ts
    ├── alertUtils.ts
    └── loki.ts
```

#### Migration Strategy

**Option A (Recommended for Phase 1)**: Keep alerts context-based within shell
- Shell continues to provide `AlertsProvider`
- Micro apps access alerts via `shellStore.alerts` or similar
- Deferred full migration to later phase

**Option B (Full Migration)**: Add alerts to shellStore
```typescript
interface ShellState {
  // ... other state
  alerts: Alert[];
  alertsStatus: 'loading' | 'success' | 'error';
  
  // Alert selectors
  getAlertsBySelector: (selector: AlertSelector) => Alert[];
  getHighestSeverityAlerts: (filter: AlertFilter) => Alert[];
}
```

---

## Phase 5: File-by-File Migration Checklist

### Shell-UI Files

| File | Action | Priority |
|------|--------|----------|
| `src/services/ShellStore/types.ts` | Create | P0 |
| `src/services/ShellStore/slices/authSlice.ts` | Create | P0 |
| `src/services/ShellStore/slices/configSlice.ts` | Create | P0 |
| `src/services/ShellStore/slices/uiSlice.ts` | Create | P0 |
| `src/services/ShellStore/slices/navigationSlice.ts` | Create | P0 |
| `src/services/ShellStore/store.ts` | Create (combines slices) | P0 |
| `src/services/ShellStore/index.ts` | Create (exports) | P0 |
| `src/FederatedApp.tsx` | Modify (add bridge routing) | P0 |
| `src/initFederation/ConfigurationProviders.tsx` | Modify (populate ConfigSlice) | P0 |
| `src/initFederation/ShellConfigProvider.tsx` | Modify (populate ConfigSlice) | P0 |
| `src/initFederation/ShellHistoryProvider.tsx` | Modify (populate NavigationSlice) | P0 |
| `src/auth/AuthProvider.tsx` | Modify (populate AuthSlice) | P0 |
| `src/navbar/lang.tsx` | Modify (populate UISlice) | P1 |
| `rspack.config.ts` | Modify (bridge config) | P1 |

### MetalK8s UI Files

> **Note**: Per the atomic migration strategy (see 3.3), all files below are migrated **together**. The micro app does NOT need to maintain both legacy and bridge patterns—only the shell does.

| File | Action | Order |
|------|--------|-------|
| `src/types/shell.ts` | Create (copy types from shell) | 1 |
| `src/hooks/useShellStore.ts` | Create (wrapper hooks) | 2 |
| `src/FederableApp.tsx` | Rewrite (from legacy to bridge pattern) | 3 |
| `rspack.config.ts` | Verify (FederableApp already exposed) | 4 |
| `src/containers/PrivateRoute.tsx` | Modify (use store hooks) | 5 |
| `src/containers/IntlProvider.tsx` | Modify (use store hooks) | 5 |
| `src/containers/AlertProvider.tsx` | Modify (use store hooks) | 5 |
| `src/containers/Layout.tsx` | Modify (use store hooks) | 5 |
| `src/components/DashboardAlerts.tsx` | Modify (use store hooks) | 5 |
| `src/components/HealthItem.tsx` | Modify (use store hooks) | 5 |
| (all other files using `@scality/module-federation`) | Modify (use store hooks) | 5 |
| `public/.well-known/micro-app-configuration` | Modify (set `bridge: true`) | 6 (final) |

> **⚠️ Important**: The `micro-app-configuration` change (setting `bridge: true`) should be the **last step**. All other changes should be complete and tested before this flag is set.

---

## Phase 6: Testing Strategy

### 6.1 Unit Tests

- [ ] ShellStore actions and selectors
- [ ] useShellStore hooks in isolation
- [ ] Hook replacement equivalence tests

### 6.2 Integration Tests

| Scenario | Description |
|----------|-------------|
| Shell + Bridge App | Shell loads micro app with `bridge: true` |
| Shell + Legacy App | Shell loads micro app with `bridge: false/undefined` |
| Shell + Mixed Apps | Shell loads both bridge and legacy apps simultaneously |
| Auth Flow (Bridge) | Login → Token refresh → Logout with bridge app |
| Navigation (Bridge) | Cross-route navigation within bridge app |

### 6.3 E2E Tests

- [ ] Full authentication flow (login, token refresh, logout)
- [ ] Cross-app navigation
- [ ] React Query cache sharing verification
- [ ] Deep linking with bridge apps
- [ ] Browser back/forward navigation

---

## Phase 7: Migration Order

### Recommended Sequence

```
Week 1-2: Shell Foundation (Slices Pattern)
├── Create ShellStore types
├── Implement AuthSlice
├── Implement ConfigSlice  
├── Implement UISlice
├── Implement NavigationSlice
├── Create combined bounded store
├── Integrate slice population in existing providers
└── Add bridge detection logic to micro-app-configuration schema

Week 3-4: Shell Bridge Routing
├── Implement createRemoteAppComponent wrapper
├── Add conditional routing (bridge vs legacy based on spec.bridge)
├── Test with existing POC
└── Verify shellStore is fully populated before app mount

Week 5-6: MetalK8s UI Migration (Atomic)
├── Create shell types and wrapper hooks (useShellStore.ts)
├── Rewrite FederableApp.tsx with bridge pattern
├── Update ALL components to use store hooks (single migration)
├── Test with bridge: false (ensure no regressions)
└── Flip micro-app-configuration to bridge: true (final activation)

Week 7: Integration Testing
├── Test bridge mode (spec.bridge: true)
├── Test legacy mode (spec.bridge: false/undefined)
├── Verify retrocompatibility with mixed apps
└── Performance testing

Week 8+: Rollout & Stabilization
├── Deploy to staging
├── Monitor for issues
└── Document learnings
```

---

## Critical Attention Points Summary

| Area | Risk | Mitigation |
|------|------|------------|
| Auth token refresh | 🔴 High | Store `userManager`, ensure populated before app render |
| React Query cache | 🔴 High | Pass same `queryClient` instance via props |
| Store hydration timing | 🔴 High | Wait for shellStore population before mounting apps |
| Bridge detection | 🟡 Medium | Check `spec.bridge === true` in micro-app-configuration |
| Navigation basename | 🟡 Medium | Verify all routes work with `basename` prop |
| Alerts propagation | 🟡 Medium | Keep context-based initially, migrate later |
| Shell retrocompatibility | 🟡 Medium | Shell must support both legacy and bridge apps simultaneously |
| Micro app retrocompatibility | 🟢 N/A | NOT needed—micro apps migrate atomically, no dual support |
| Redux coexistence | 🟢 Low | Redux works alongside Zustand |
| Styled-components | 🟢 Low | Already shared singleton |

---

## Rollback Strategy

If issues are discovered post-deployment:

1. **Per-App Rollback (Micro App)**: Git revert the migration commit to restore legacy `FederableApp.tsx` and hooks, then set `spec.bridge: false`
2. **Shell Rollback**: Revert shell changes to use only `FederatedComponent` (affects all apps)
3. **Partial Shell Rollback**: Keep shellStore but disable bridge routing (legacy apps continue to work)

> **Note**: Per-app rollback is a git revert + config change. The shell's retrocompatibility ensures legacy apps continue to work regardless of shell version.

---

## Success Criteria

- [ ] Micro apps load successfully with `bridge: true`
- [ ] Legacy apps continue to work with `bridge: false`
- [ ] Authentication works identically in both modes
- [ ] No regression in page load performance (< 10% delta)
- [ ] React Query cache shared correctly
- [ ] No console errors related to federation
- [ ] E2E tests pass for all critical flows

---

## Appendix: Zustand Slices Pattern Reference

### Why Slices Pattern?

The Slices Pattern provides several benefits:

1. **Modularity**: Each slice manages its own domain (auth, config, UI, navigation)
2. **Maintainability**: Smaller, focused files are easier to maintain
3. **Testability**: Individual slices can be tested in isolation
4. **Cross-slice access**: Slices can access other slices via `get()` (e.g., `navigationSlice` can access `shellConfig`)

### Slice Composition Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        shellStore                                │
│  ┌─────────────┐ ┌─────────────┐ ┌────────┐ ┌───────────────┐   │
│  │  AuthSlice  │ │ ConfigSlice │ │UISlice │ │NavigationSlice│   │
│  ├─────────────┤ ├─────────────┤ ├────────┤ ├───────────────┤   │
│  │ userData    │ │ webFingers  │ │language│ │ shellNavigate │   │
│  │ authStatus  │ │ deployedApps│ │theme   │ │ openLink()    │   │
│  │ userManager │ │ shellConfig │ │        │ │               │   │
│  │ setAuth()   │ │ getConfig() │ │        │ │               │   │
│  │ getToken()  │ │ getApps()   │ │        │ │               │   │
│  │ logout()    │ │             │ │        │ │               │   │
│  └─────────────┘ └─────────────┘ └────────┘ └───────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ passed as prop
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Micro App (Bridge)                          │
│                                                                  │
│   const auth = useStore(shellStore, s => ({                     │
│     userData: s.userData,                                        │
│     getToken: s.getToken,                                        │
│   }));                                                           │
│                                                                  │
│   const config = shellStore.getState().getConfiguration({...}); │
└─────────────────────────────────────────────────────────────────┘
```

### Vanilla Store vs React Store

The `shellStore` uses `createStore` from `zustand/vanilla` (not `create` from `zustand`) because:

1. **Vanilla stores** can be used outside React (passed as props to bridge components)
2. **Vanilla stores** work with Module Federation without React context issues
3. Micro apps consume with `useStore(shellStore, selector)` hook

```typescript
// Shell: vanilla store (no React dependency)
import { createStore } from 'zustand/vanilla';
export const shellStore = createStore<ShellState>()((...a) => ({
  ...createAuthSlice(...a),
  ...createConfigSlice(...a),
  // ...
}));

// Micro App: React consumption
import { useStore } from 'zustand';
const userData = useStore(props.shellStore, (s) => s.userData);
```

### Adding New Slices

To add a new slice (e.g., `alertsSlice`):

1. Create the slice file:

```typescript
// slices/alertsSlice.ts
import type { StateCreator } from 'zustand';
import type { ShellState } from '../types';

export interface AlertsSlice {
  alerts: Alert[];
  setAlerts: (alerts: Alert[]) => void;
  getAlertsBySelector: (selector: AlertSelector) => Alert[];
}

export const createAlertsSlice: StateCreator<
  ShellState,
  [],
  [],
  AlertsSlice
> = (set, get) => ({
  alerts: [],
  setAlerts: (alerts) => set({ alerts }),
  getAlertsBySelector: (selector) => {
    return get().alerts.filter(/* filter logic */);
  },
});
```

2. Update the combined store:

```typescript
// store.ts
import { createAlertsSlice, AlertsSlice } from './slices/alertsSlice';

export type ShellState = AuthSlice & ConfigSlice & UISlice & NavigationSlice & AlertsSlice;

export const shellStore = createStore<ShellState>()((...a) => ({
  ...createAuthSlice(...a),
  ...createConfigSlice(...a),
  ...createUISlice(...a),
  ...createNavigationSlice(...a),
  ...createAlertsSlice(...a),
}));
```

### TypeScript Considerations

The `StateCreator` type ensures type safety across slices:

```typescript
import type { StateCreator } from 'zustand';

// The generic parameters:
// - ShellState: The full combined state (all slices)
// - []: Middleware tuple (empty if none)
// - []: Mutators tuple (empty if none)
// - AuthSlice: This slice's contribution to the state

export const createAuthSlice: StateCreator<
  ShellState,  // Full state - allows accessing other slices via get()
  [],
  [],
  AuthSlice    // This slice's interface
> = (set, get) => ({
  // Implementation
});
```

This allows slices to access each other:

```typescript
// In navigationSlice, accessing config from configSlice
openLink: (to) => {
  const { shellConfig } = get();  // Access configSlice state
  // ...
}
```

