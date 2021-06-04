//@flow
import { createContext, useContext, useState, useEffect, lazy, Suspense, type Node, useMemo } from 'react';
import Loader from '@scality/core-ui/dist/components/loader/Loader.component';
import ReactDOM from "react-dom";
import { QueryClient, QueryClientProvider } from 'react-query';
import ErrorPage500 from '@scality/core-ui/dist/components/error-pages/ErrorPage500.component';
import ScrollbarWrapper from '@scality/core-ui/dist/components/scrollbarwrapper/ScrollbarWrapper.component';
import { ThemeProvider as StyledComponentsProvider } from 'styled-components';
import type { Theme } from './navbar/theme';
import { SolutionsNavbar, type Browser } from './navbar';
import { string } from 'prop-types';
import { FederatedComponent, type FederatedComponentProps } from './ModuleFederation';
import { useAuth as useOidcReactAuth, type AuthContextProps } from 'oidc-react';
import AlertProvider from './alerts/AlertProvider';

export const queryClient: typeof QueryClient = new QueryClient();

//TODO restrict useAuth to userName, token and groups to be able to support non oidc auth schemes
export function useAuth(): AuthContextProps {
    return useOidcReactAuth();
}

export default function App(): Node {
    const navbarConfigUrl = "/shell/config.json"; // TODO find a way to inject this
    const [federatedComponent, setFederatedComponent] = useState<FederatedComponentProps | null>(null);

    const federatedBrowser: Browser = useMemo(() => ({
        open: ({path, pathDescription}) =>{
            if (pathDescription.module && pathDescription.scope && pathDescription.url) {
                //$FlowIssue - module, scope and url are defined
                setFederatedComponent(pathDescription);
                window.history.pushState({}, document.title, path);
            }
        }
    }), []);

    return (
        <ScrollbarWrapper>
            <QueryClientProvider client={queryClient}>
                <SolutionsNavbar
                    config-url={navbarConfigUrl}
                    federatedBrowser={federatedBrowser}
                    onAuthenticated={(e) => console.log(JSON.stringify(e.detail))}
                    >{/*TODO wrap with an error boundary to handle error while loading the config */}
                    {federatedComponent && <FederatedComponent {...federatedComponent} />}
                </SolutionsNavbar>
            </QueryClientProvider>
        </ScrollbarWrapper>
      );
}
