//@flow
import { createContext, useContext, useState, useEffect, lazy, Suspense, type Node } from 'react';
import { Loader } from '@scality/core-ui/dist/components/loader/Loader.component';
import ReactDOM from "react-dom";
import { QueryClient, QueryClientProvider } from 'react-query';
import ErrorPage500 from '@scality/core-ui/dist/components/error-pages/ErrorPage500.component';
import ScrollbarWrapper from '@scality/core-ui/dist/components/scrollbarwrapper/ScrollbarWrapper.component';
import { ThemeProvider as StyledComponentsProvider } from 'styled-components';
import type { Theme } from './navbar/theme';
import { SolutionsNavbar, type Browser } from './navbar';
import { string } from 'prop-types';
import { FederatedModule, type FederatedModuleProps } from './ModuleFederation';

export const queryClient: typeof QueryClient = new QueryClient();

export default function App(): Node {
    const navbarConfigUrl = "/shell/config.json"; // TODO find a way to inject this
    const [federatedModule, setFederatedModule] = useState<FederatedModuleProps | null>(null);

    const federatedBrowser: Browser = {
        open: ({path, pathDescription}) =>{
            if (pathDescription.module && pathDescription.scope && pathDescription.url) {
                //$FlowIssue - module, scope and url are defined
                setFederatedModule(pathDescription);
                window.history.pushState({}, document.title, path);
            }
        }
    }

    return (
        <ScrollbarWrapper>
            <QueryClientProvider client={queryClient}>
                <SolutionsNavbar config-url={navbarConfigUrl} federatedBrowser={federatedBrowser}>{/*TODO wrap with an error boundary to handle error while loading the config */}
                    {federatedModule && <FederatedModule {...federatedModule} />}
                </SolutionsNavbar>
            </QueryClientProvider>
        </ScrollbarWrapper>
      );
}

ReactDOM.render(<App />, document.getElementById("app"));
