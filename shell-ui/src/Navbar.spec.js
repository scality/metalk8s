import { setupServer } from 'msw/node';
import { rest } from 'msw';
import { screen, render } from '@testing-library/react';
import './index';
import { waitForLoadingToFinish } from './__TESTS__/utils';

const server = setupServer(
    rest.get(
        'https://mocked.ingress/oidc/.well-known/openid-configuration',
        (req, res, ctx) => {
            const result = {
                "issuer": "https://mocked.ingress/oidc",
                "authorization_endpoint": "https://mocked.ingress/oidc/auth",
                "token_endpoint": "https://mocked.ingress/oidc/token",
                "jwks_uri": "https://mocked.ingress/oidc/keys",
                "userinfo_endpoint": "https://mocked.ingress/oidc/userinfo",
                "response_types_supported": ["code", "id_token", "token"],
                "subject_types_supported": ["public"],
                "id_token_signing_alg_values_supported": ["RS256"],
                "scopes_supported": [
                  "openid",
                  "email",
                  "groups",
                  "profile",
                  "offline_access"
                ],
                "token_endpoint_auth_methods_supported": ["client_secret_basic"],
                "claims_supported": [
                  "aud",
                  "email",
                  "email_verified",
                  "exp",
                  "iat",
                  "iss",
                  "locale",
                  "name",
                  "sub"
                ]
              }
              ;
            return res(ctx.json(result));
          },
    )
)

describe('navbar', () => {
    // use fake timers to let react query retry immediately after promise failure
    jest.useFakeTimers();

    beforeAll(() => server.listen());
    afterEach(() => server.resetHandlers())

    it('should display a loading state when resolving its configuration', () => {
        //E
        render(<solutions-navbar 
            oidc-provider-url="https://mocked.ingress/oidc" 
            client-id="metalk8s-ui"
            response-type="id_token"
            redirect-url="http://localhost:8082"
            config-url="/shell/config.json"
            scopes="openid profile email groups offline_access audience:server:client_id:oidc-auth-client"
            />
        )
        //V
        expect(screen.getByText('loading')).toBeInTheDocument();
    })

    it('should display an error state when it failed to resolves its configuration', async () => {
        //S
        server.use(
            rest.get(
              '/shell/config.json',
              (req, res, ctx) => {
                return res(ctx.status(500));
              },
            )
          );

        render(<solutions-navbar 
            oidc-provider-url="https://mocked.ingress/oidc" 
            client-id="metalk8s-ui"
            response-type="id_token"
            redirect-url="http://localhost:8082"
            config-url="/shell/config.json"
            scopes="openid profile email groups offline_access audience:server:client_id:oidc-auth-client"
            />
        )
        //V
        await waitForLoadingToFinish();

        expect(screen.getByText(/Failed to load navbar configuration/i)).toBeInTheDocument();
    })

    it('should display expected menu when it resolved its configuration', async () => {
        //S
        server.use(
            rest.get(
                '/shell/config.json',
                (req, res, ctx) => {
                  const result = {
                    
                  };
                  return res(ctx.json(result));
                },
              ),
        )

        // This is a hack to workarround the following issue : MSW return lower cased content-type header, 
        // oidc-client is internally using XMLHttpRequest to perform queries and retrieve response header Content-Type using 'XMLHttpRequest.prototype.getResponseHeader'.
        // XMLHttpRequest.prototype.getResponseHeader is case sensitive and hence when receiving a response with header content-type it is not mapping it to Content-Type
        const caseSensitiveGetResponseHeader = XMLHttpRequest.prototype.getResponseHeader;
        XMLHttpRequest.prototype.getResponseHeader = function(header) {
            if (header === 'Content-Type') {
                return caseSensitiveGetResponseHeader.call(this, 'content-type');
            }
            return caseSensitiveGetResponseHeader.call(this, header);
        }

        render(<solutions-navbar 
            oidc-provider-url="https://mocked.ingress/oidc" 
            client-id="metalk8s-ui"
            response-type="id_token"
            redirect-url="http://localhost:8082"
            config-url="/shell/config.json"
            scopes="openid profile email groups offline_access audience:server:client_id:oidc-auth-client"
            options={
                JSON.stringify({
                    "main": {
                        "http://localhost:8082/":{ "en": "Platform", "fr": "Plateforme" },
                        "http://localhost:8082/test":{ "en": "Test", "fr": "Test" }
                    },
                    "subLogin": {}
                })
            }
            />
        )
        //E
        await waitForLoadingToFinish();
        //V
        expect(screen.getByText(/Platform/i)).toBeInTheDocument();
    })

    afterAll(() => server.close());
})
